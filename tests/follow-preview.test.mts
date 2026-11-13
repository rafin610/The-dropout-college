import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { ConnectionPreview } from "../src/components/profile/connection-preview";

test("follow previews remain capped at two avatars for every list size", () => {
  for (const count of [0, 1, 2, 100, 1_000]) {
    const people = Array.from({ length: count }, (_, index) => ({
      follower_id: `member-${index}`,
      profiles: {
        id: `member-${index}`,
        display_name: `Member ${index}`,
        username: `member${index}`,
        avatar_url: null,
      },
    }));
    const markup = renderToStaticMarkup(
      createElement(ConnectionPreview, {
        label: "Followers",
        count,
        people,
        loading: false,
        onClick: () => {},
      }),
    );
    const avatars = markup.match(/class="c-avatar profile-connection-avatar-/g) ?? [];

    assert.equal(avatars.length, Math.min(2, count), `avatar count for ${count} followers`);
    assert.match(markup, new RegExp(`View ${count.toLocaleString()} followers`));
    assert.match(markup, new RegExp(`>${count.toLocaleString()}<`));
  }
});
