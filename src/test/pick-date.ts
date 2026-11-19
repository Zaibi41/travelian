import { fireEvent, screen, within } from "@testing-library/react";

/** Pick an ISO date in a DatePickerField the way a person does: open it, choose the month and year in the calendar's
 *  lists, click the day. `field`: the trigger button (e.g. getByLabelText("Date of Birth *")). */
export function pickDate(field: HTMLElement, iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  fireEvent.click(field);
  const dialog = screen.getByRole("dialog");
  // The year first: the month list only offers months inside the allowed range of the shown year.
  fireEvent.change(within(dialog).getAllByRole("combobox")[1], { target: { value: String(year) } });
  fireEvent.change(within(screen.getByRole("dialog")).getAllByRole("combobox")[0], { target: { value: String(month - 1) } });
  const cells = within(screen.getByRole("dialog")).getAllByRole("gridcell").filter(cell => cell.textContent?.trim() === String(day));
  fireEvent.click(cells[0]);
}

/** Choose an option in a Radix select from the keyboard (Enter opens, Enter chooses). */
export function chooseOption(trigger: HTMLElement, option: string | RegExp) {
  fireEvent.keyDown(trigger, { key: "Enter" });
  fireEvent.keyDown(screen.getByRole("option", { name: option }), { key: "Enter" });
}
