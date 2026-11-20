import { describe, expect, it } from "vitest";
import { createPassengerDetails, passengerComplete, passengerErrors } from "./passenger-details";

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

