import { describe, expect, it } from "vitest";
import { splitList, toDraft, toUpdate } from "@/lib/project-draft";
import type { Project } from "@/contract";

/**
 * The admin form has to do two opposite things: start from nothing when adding a project, and start
 * from an existing one when changing it. These are the translations between the two, and they are the
 * part worth testing — the rest of the page is layout.
 */

const project: Project = {
  slug: "match-3",
  name: "Match 3",
  description: "A gem-matching puzzle game.",
  status: "live",
  stack: ["Godot", "GDScript"],
  when: "2026",
  delivery: "play",
  href: "/match3",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
};

describe("opening a project in the form", () => {
  it("carries every field the form owns", () => {
    const draft = toDraft(project);
    expect(draft.name).toBe("Match 3");
    expect(draft.slug).toBe("match-3");
    expect(draft.description).toBe("A gem-matching puzzle game.");
    expect(draft.status).toBe("live");
    expect(draft.when).toBe("2026");
    expect(draft.href).toBe("/match3");
  });

  it("joins the stack back into one field, because that is how it is typed", () => {
    expect(toDraft(project).stack).toBe("Godot, GDScript");
  });

  it("does not claim an empty stack", () => {
    expect(toDraft({ ...project, stack: [] }).stack).toBe("");
  });

  it("shows whether the card hands a file over", () => {
    expect(toDraft(project).download).toBe(false);
    expect(toDraft({ ...project, delivery: "download" }).download).toBe(true);
  });

  it("round-trips a project unchanged", () => {
    // Save without editing anything and nothing should move.
    const update = toUpdate(toDraft(project));
    expect(update.name).toBe(project.name);
    expect(update.description).toBe(project.description);
    expect(update.status).toBe(project.status);
    expect(update.stack).toEqual(project.stack);
    expect(update.when).toBe(project.when);
    expect(update.href).toBe(project.href);
  });
});

describe("saving an existing project", () => {
  it("never sends the address as something to change", () => {
    // The address is where the files already are; renaming it would move neither.
    expect(toUpdate({ ...toDraft(project), slug: "renamed" })).not.toHaveProperty("slug");
  });

  it("leaves the link out when it has been cleared", () => {
    // An empty string is not a path. Sending it would be refused; leaving it undefined drops it from
    // the JSON, which means "do not change this", and that is what an untouched field means.
    expect(toUpdate({ ...toDraft(project), href: "" }).href).toBeUndefined();
    expect(toUpdate({ ...toDraft(project), href: "  " }).href).toBeUndefined();
  });

  it("sends the link when there is one", () => {
    expect(toUpdate({ ...toDraft(project), href: " /calendar " }).href).toBe("/calendar");
  });

  it("splits the stack field into entries", () => {
    expect(toUpdate({ ...toDraft(project), stack: "Go, Postgres" }).stack).toEqual(["Go", "Postgres"]);
  });
});

describe("splitList", () => {
  it("trims and drops empties", () => {
    // A trailing comma is easy to type and must not become an empty chip on the card.
    expect(splitList("Godot, GDScript, ")).toEqual(["Godot", "GDScript"]);
    expect(splitList("")).toEqual([]);
    expect(splitList("   ")).toEqual([]);
    expect(splitList("one")).toEqual(["one"]);
  });

  it("keeps an entry that is only spaces inside a name", () => {
    expect(splitList("Visual Studio Code, Go")).toEqual(["Visual Studio Code", "Go"]);
  });
});
