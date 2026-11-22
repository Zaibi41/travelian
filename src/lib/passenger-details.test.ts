import { describe, expect, it } from "vitest";
import { ageOn, cleanPassportNumber, createPassengerDetails, dobCalendarStart, dobFareNote, genderForTitle, kindForAge, nameIsLong, passengerComplete, passengerErrors, travelerFullName } from "./passenger-details";

const complete = { ...createPassengerDetails("adult", "Adult 1"), gender: "male", firstName: "Ali", lastName: "Raza", dob: "1990-01-31",
  docNumber: "AB1234567", expiryDate: "2031-01-01" };

describe("passenger checks (website checkout and admin hold form)", () => {
  it("a blank passenger lists the website's messages", () => {
    expect(passengerErrors(createPassengerDetails("adult", "Adult 1"))).toEqual({
      gender: "Gender is required", firstName: "First name is required", lastName: "Last name is required", dob: "Date of birth is required",
      docNumber: "Passport number is required", expiryDate: "Expiry date is required",
    });
    expect(passengerComplete(complete)).toBe(true);
  });

  it("passport 6-12 letters/digits; CNIC 13 digits (dashes allowed) and no expiry", () => {
    expect(passengerErrors({ ...complete, docNumber: "AB12" }).docNumber).toBe("Enter a valid passport number (6-12 letters/digits)");
    const cnic = { ...complete, docType: "cnic" as const, expiryDate: undefined };
    expect(passengerErrors({ ...cnic, docNumber: "12345" }).docNumber).toBe("Enter a valid 13-digit CNIC");
    expect(passengerErrors({ ...cnic, docNumber: "35201-1234567-1" })).toEqual({});
  });

  it("date of birth in the past; passport valid after the travel date (and not expired)", () => {
    expect(passengerErrors({ ...complete, dob: "2999-01-01" }).dob).toBe("Date of birth must be in the past");
    expect(passengerErrors({ ...complete, expiryDate: "2030-06-01" }, "2030-06-01").expiryDate).toBe("Passport must be valid after the travel date (1 Jun 2030)");
    expect(passengerErrors({ ...complete, expiryDate: "2030-06-02" }, "2030-06-01").expiryDate).toBeUndefined();
    expect(passengerErrors({ ...complete, expiryDate: "2001-01-01" }).expiryDate).toBe("This passport has expired");
  });
});

describe("CNIC up front", () => {
  it("numbers the gateway's list per passenger type, in form order", async () => {
    const { requiredDocuments } = await import("./passenger-details");
    const forms = [{ passengerType: "adult" as const }, { passengerType: "adult" as const }, { passengerType: "child" as const }, { passengerType: "infant" as const }];
    expect(requiredDocuments(forms, [{ type: "ADT", number: 2, document: "cnic" }, { type: "CHD", number: 1, document: "passport" }]))
      .toEqual([undefined, "cnic", "passport", undefined]);
    expect(requiredDocuments(forms, null)).toEqual([undefined, undefined, undefined, undefined]);
  });

  it("a passport where the airline needs a CNIC is an error on the document, saying what to do", async () => {
    const { createPassengerDetails, passengerErrors } = await import("./passenger-details");
    const passenger = { ...createPassengerDetails("adult", "Adult 1"), docType: "passport" as const, docNumber: "AB1234567", expiryDate: "2035-01-01" };
    expect(passengerErrors(passenger, undefined, "cnic").docNumber).toBe(
      "This airline needs the traveler's CNIC / B-form for this flight. Choose CNIC / B-form and enter the 13 digits.");
    expect(passengerErrors({ ...passenger, docType: "cnic", docNumber: "3520112345671" }, undefined, "cnic").docNumber).toBeUndefined();
  });
});


describe("#11 salutations", () => {
  it("lists Mr, Mrs, Ms, Mstr, Miss and prints stored titles the same way", async () => {
    const { TITLE_OPTIONS, titleText } = await import("./passenger-details");
    expect(TITLE_OPTIONS.map(([, text]) => text)).toEqual(["Mr", "Mrs", "Ms", "Mstr", "Miss"]);
    expect(["MR", "MRS", "MS", "MASTER", "MISS", "mr", null].map(titleText)).toEqual(["Mr", "Mrs", "Ms", "Mstr", "Miss", "Mr", ""]);
  });
});

describe("age on the last travel date (issue #52)", () => {
  const child = { ...createPassengerDetails("child", "Child 1"), gender: "female", firstName: "Misbah", lastName: "Khan",
    docNumber: "AB1234567", expiryDate: "2031-01-01" };
  const infant = { ...child, passengerType: "infant" as const, label: "Infant 1" };

  it("counts whole years, the birthday on the day itself", () => {
    expect(ageOn("2014-12-10", "2026-12-09")).toBe(11);
    expect(ageOn("2014-12-10", "2026-12-10")).toBe(12);
    expect(ageOn("2016-02-29", "2026-02-28")).toBe(9);
    expect(ageOn("2016-02-29", "2026-03-01")).toBe(10);
    expect([1, 2, 11, 12].map(kindForAge)).toEqual(["infant", "child", "child", "adult"]);
  });

  it("says the age and fare type as soon as the date of birth is picked", () => {
    expect(dobFareNote({ ...child, dob: "2017-03-05" }, "2026-12-10")).toEqual({
      text: "Will be 9 on the travel date (10 Dec 2026), that's a Child fare.", matches: true });
    expect(dobFareNote({ ...child, dob: "2017-03-05" }, undefined)).toBeNull();
    expect(dobFareNote({ ...child, dob: undefined }, "2026-12-10")).toBeNull();
  });

  it("turning 12 before the travel date: an Adult fare, refused for a child", () => {
    // 11 today (21 Nov 2026), 12 on the 10 Dec flight.
    const turning12 = { ...child, dob: "2014-12-01" };
    const note = dobFareNote(turning12, "2026-12-10");
    expect(note?.matches).toBe(false);
    expect(note?.text).toMatch(/^Will be 12 on the travel date \(10 Dec 2026\), that's an Adult fare, not Child\./);
    expect(passengerErrors(turning12, "2026-12-10").dob).toBe(note?.text);
    expect(passengerErrors(turning12, "2026-11-30").dob).toBeUndefined();
  });

  it("turning 2 before the travel date: a Child fare, refused for an infant", () => {
    const turning2 = { ...infant, dob: "2024-12-05" };
    expect(passengerErrors(turning2, "2026-12-04").dob).toBeUndefined();
    expect(dobFareNote(turning2, "2026-12-04")?.text).toBe("Will be 1 on the travel date (4 Dec 2026), that's an Infant fare.");
    expect(passengerErrors(turning2, "2026-12-05").dob).toMatch(/that's a Child fare, not Infant/);
  });

  it("round trip: the age is taken on the return date, not the departure date", () => {
    const turns12OnTrip = { ...child, dob: "2014-12-15" };
    expect(passengerErrors(turns12OnTrip, "2026-12-10").dob).toBeUndefined(); // departure 10 Dec: still 11
    expect(passengerErrors(turns12OnTrip, "2026-12-20").dob).toMatch(/Will be 12 .*Adult fare/); // return 20 Dec: 12
  });

  it("an infant under 1 reads 'under 1'", () => {
    expect(dobFareNote({ ...infant, dob: "2026-06-01" }, "2026-12-10")?.text).toBe("Will be under 1 on the travel date (10 Dec 2026), that's an Infant fare.");
  });
});

describe("names, passport, title and date of birth (#155)", () => {
  it("names take letters, spaces, hyphen and apostrophe only", () => {
    expect(passengerErrors({ ...complete, firstName: "Ali123 @#" }).firstName).toBe("Use letters only, as on the passport");
    expect(passengerErrors({ ...complete, lastName: "Raza." }).lastName).toBe("Use letters only, as on the passport");
    expect(passengerErrors({ ...complete, firstName: "Mary-Jane", lastName: "O'Neil Khan" })).toEqual({});
    expect(passengerErrors({ ...complete, firstName: "" }).firstName).toBe("First name is required");
  });

  it("warns (does not block) when first and last name together pass 50 letters", () => {
    expect(nameIsLong({ firstName: "A".repeat(25), lastName: "B".repeat(25) })).toBe(false);
    expect(nameIsLong({ firstName: "A".repeat(26), lastName: "B".repeat(25) })).toBe(true);
    expect(passengerComplete({ ...complete, firstName: "A".repeat(30), lastName: "B".repeat(30) })).toBe(true);
  });

  it("a passport typed with spaces is cleaned and accepted", () => {
    expect(cleanPassportNumber("ab 123 4567")).toBe("AB1234567");
    expect(passengerErrors({ ...complete, docNumber: "AB 1234567" }).docNumber).toBeUndefined();
    expect(passengerErrors({ ...complete, docNumber: "AB 12" }).docNumber).toMatch(/valid passport/);
  });

  it("the title gives the gender", () => {
    expect(genderForTitle("mr")).toBe("male");
    expect(genderForTitle("master")).toBe("male");
    expect(genderForTitle("mrs")).toBe("female");
    expect(genderForTitle("ms")).toBe("female");
    expect(genderForTitle("miss")).toBe("female");
    expect(genderForTitle("")).toBe("");
  });

  it("the date-of-birth calendar opens on a year that fits the traveler", () => {
    const today = new Date(2026, 10, 22);
    expect(dobCalendarStart("adult", today)).toBe("1996-11-01");
    expect(dobCalendarStart("child", today)).toBe("2020-11-01");
    expect(dobCalendarStart("infant", today)).toBe("2025-11-01");
  });

  it("full name for checking: Title First LAST", () => {
    expect(travelerFullName({ title: "mrs", firstName: " Ayesha ", lastName: "Khan" })).toBe("Mrs Ayesha KHAN");
  });
});
