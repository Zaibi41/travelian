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
