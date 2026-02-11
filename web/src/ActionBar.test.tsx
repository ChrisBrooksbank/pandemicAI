import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { ActionBar } from "./ActionBar";
import type { GameAction } from "./state";

describe("ActionBar", () => {
  const mockDispatch = vi.fn();

  it("renders Actions phase with available actions", () => {
    const availableActions = [
      "drive-ferry:Chicago",
      "drive-ferry:Miami",
      "treat:blue",
      "build-research-station",
    ];

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={4}
        availableActions={availableActions}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Actions Phase")).toBeInTheDocument();
    expect(screen.getByText("4 actions remaining")).toBeInTheDocument();
    expect(screen.getByText("Drive to Chicago")).toBeInTheDocument();
    expect(screen.getByText("Drive to Miami")).toBeInTheDocument();
    expect(screen.getByText("Treat blue")).toBeInTheDocument();
    expect(screen.getByText("Build Station")).toBeInTheDocument();
    expect(screen.getByText("End Actions Phase")).toBeInTheDocument();
  });

  it("renders Draw phase with draw button", () => {
    render(
      <ActionBar
        phase="draw"
        actionsRemaining={0}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Draw Phase")).toBeInTheDocument();
    expect(screen.getByText("Draw 2 Cards")).toBeInTheDocument();
  });

  it("renders Infect phase with infect button", () => {
    render(
      <ActionBar
        phase="infect"
        actionsRemaining={0}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Infect Phase")).toBeInTheDocument();
    expect(screen.getByText("Infect Cities")).toBeInTheDocument();
  });

  it("dispatches PERFORM_ACTION when action button clicked", async () => {
    const user = userEvent.setup();
    const availableActions = ["drive-ferry:Chicago"];

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={4}
        availableActions={availableActions}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    const button = screen.getByText("Drive to Chicago");
    await user.click(button);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "PERFORM_ACTION",
      action: "drive-ferry:Chicago",
    });
  });

  it("dispatches PERFORM_ACTION for pass action", async () => {
    const user = userEvent.setup();

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={2}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    const button = screen.getByText("End Actions Phase");
    await user.click(button);

    expect(mockDispatch).toHaveBeenCalledWith({
      type: "PERFORM_ACTION",
      action: "pass",
    });
  });

  it("dispatches DRAW_CARDS when draw button clicked", async () => {
    const user = userEvent.setup();

    render(
      <ActionBar
        phase="draw"
        actionsRemaining={0}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    const button = screen.getByText("Draw 2 Cards");
    await user.click(button);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "DRAW_CARDS" });
  });

  it("dispatches INFECT_CITIES when infect button clicked", async () => {
    const user = userEvent.setup();

    render(
      <ActionBar
        phase="infect"
        actionsRemaining={0}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    const button = screen.getByText("Infect Cities");
    await user.click(button);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "INFECT_CITIES" });
  });

  it("groups actions by type", () => {
    const availableActions = [
      "drive-ferry:Chicago",
      "direct-flight:Tokyo",
      "treat:blue",
      "treat:yellow",
      "build-research-station",
      "share-give:Atlanta:1",
      "discover-cure:blue",
    ];

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={4}
        availableActions={availableActions}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Movement")).toBeInTheDocument();
    expect(screen.getByText("Treat Disease")).toBeInTheDocument();
    expect(screen.getByText("Build")).toBeInTheDocument();
    expect(screen.getByText("Share Knowledge")).toBeInTheDocument();
    expect(screen.getByText("Discover Cure")).toBeInTheDocument();
  });

  it("only shows groups with available actions", () => {
    const availableActions = ["drive-ferry:Chicago", "treat:blue"];

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={4}
        availableActions={availableActions}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Movement")).toBeInTheDocument();
    expect(screen.getByText("Treat Disease")).toBeInTheDocument();
    expect(screen.queryByText("Build")).not.toBeInTheDocument();
    expect(screen.queryByText("Share Knowledge")).not.toBeInTheDocument();
    expect(screen.queryByText("Discover Cure")).not.toBeInTheDocument();
  });

  it("shows actions remaining counter with correct pluralization", () => {
    const { rerender } = render(
      <ActionBar
        phase="actions"
        actionsRemaining={1}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("1 action remaining")).toBeInTheDocument();

    rerender(
      <ActionBar
        phase="actions"
        actionsRemaining={2}
        availableActions={[]}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("2 actions remaining")).toBeInTheDocument();
  });

  it("formats action labels correctly", () => {
    const availableActions = [
      "drive-ferry:Chicago",
      "direct-flight:Tokyo",
      "charter-flight:Paris",
      "shuttle-flight:London",
      "treat:blue",
      "build-research-station",
      "share-give:Atlanta:1",
      "share-take:Tokyo:2",
      "discover-cure:blue",
    ];

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={4}
        availableActions={availableActions}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Drive to Chicago")).toBeInTheDocument();
    expect(screen.getByText("Fly to Tokyo")).toBeInTheDocument();
    expect(screen.getByText("Charter to Paris")).toBeInTheDocument();
    expect(screen.getByText("Shuttle to London")).toBeInTheDocument();
    expect(screen.getByText("Treat blue")).toBeInTheDocument();
    expect(screen.getByText("Build Station")).toBeInTheDocument();
    expect(screen.getByText("Give Atlanta to Player 1")).toBeInTheDocument();
    expect(screen.getByText("Take Tokyo from Player 2")).toBeInTheDocument();
    expect(screen.getByText("Discover Cure (blue)")).toBeInTheDocument();
  });

  it("formats role-specific actions correctly", () => {
    const availableActions = [
      "dispatcher-move:1:Tokyo",
      "dispatcher-direct-flight:1:Paris",
      "contingency-planner-take:Airlift",
    ];

    render(
      <ActionBar
        phase="actions"
        actionsRemaining={4}
        availableActions={availableActions}
        selectedAction={null}
        dispatch={mockDispatch}
      />
    );

    expect(screen.getByText("Role Abilities")).toBeInTheDocument();
    expect(screen.getByText("Move Player 1 to Tokyo")).toBeInTheDocument();
    expect(
      screen.getByText("Dispatcher Fly Player 1 to Paris")
    ).toBeInTheDocument();
    expect(screen.getByText("Store Event: Airlift")).toBeInTheDocument();
  });
});
