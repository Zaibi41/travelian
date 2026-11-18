import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CopyPnr } from "./CopyPnr";

describe("CopyPnr", () => {
  afterEach(() => vi.restoreAllMocks());

  it("copies the PNR in one click and doesn't trigger the row or link around it", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    const rowClick = vi.fn();
    render(<div onClick={rowClick}><CopyPnr pnr=" IKVIMS " /></div>);
    fireEvent.click(screen.getByRole("button", { name: "Copy PNR IKVIMS" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("IKVIMS"));
    expect(rowClick).not.toHaveBeenCalled();
  });

  it("renders nothing without a PNR", () => {
    const { container } = render(<CopyPnr pnr={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
