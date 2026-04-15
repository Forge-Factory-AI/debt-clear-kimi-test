#!/usr/bin/env python3
"""Extract a compact build context summary from Forge pipeline artifacts.

Reads run.json from the pipeline's artifact store and produces a short
memory-friendly summary of what was built: project name, stack, key
features, architecture, build outcome, and a truncated description.

Usage: python3 extract-build-context.py <run_dir>
Output: Multi-line summary on stdout, or empty if parsing fails.
"""

import json
import os
import sys


def extract(run_dir: str) -> str:
    run_path = os.path.join(run_dir, "run.json")
    try:
        with open(run_path) as f:
            run = json.load(f)
    except Exception:
        return ""

    lines = ["Build context from Forge pipeline:"]

    # Project name
    name = run.get(
        "projectName",
        run.get("enhancedPrompt", {}).get("appName", "unknown"),
    )
    lines.append(f"- Project: {name}")

    # Stack from plan
    plan = run.get("plan", {})
    stack = plan.get("stack", {})
    if stack:
        parts = [
            v
            for v in [
                stack.get("frontend", ""),
                stack.get("backend", ""),
                stack.get("database", ""),
            ]
            if v
        ]
        if parts:
            lines.append(f"- Stack: {' + '.join(parts)}")

    # Architecture pattern
    arch = plan.get("architecture", {})
    if arch:
        pattern = arch.get("pattern", "")
        if pattern:
            lines.append(f"- Architecture: {pattern}")

    # Key features from PRD user stories
    prd = run.get("prd", {})
    stories = prd.get("userStories", [])
    if stories:
        high = [
            s["title"]
            for s in stories
            if s.get("priority") == "high"
        ][:5]
        if high:
            lines.append(f"- Key features: {', '.join(high)}")

    # Discovery session info
    disc = run.get("discovery", {})
    if isinstance(disc, dict):
        answers = disc.get("answers", [])
        if isinstance(answers, list) and answers:
            lines.append(
                f"- Discovery: {len(answers)} questions answered"
            )

    # Build outcome
    outcome = run.get("buildOutcome", {})
    if outcome:
        completed = outcome.get("ticketsCompleted", 0)
        total = outcome.get("ticketsTotal", completed)
        if total > 0:
            lines.append(f"- Build: {completed}/{total} tickets completed")

    # Non-goals (explicitly excluded scope)
    non_goals = prd.get("nonGoals", [])
    if non_goals:
        lines.append(f"- Excluded: {', '.join(non_goals[:3])}")

    # Overview (truncated)
    overview = prd.get("overview", "")
    if overview:
        short = (
            overview[:200].rsplit(" ", 1)[0]
            if len(overview) > 200
            else overview
        )
        lines.append(f"- Description: {short}")

    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: extract-build-context.py <run_dir>", file=sys.stderr)
        sys.exit(1)
    result = extract(sys.argv[1])
    if result:
        print(result)
