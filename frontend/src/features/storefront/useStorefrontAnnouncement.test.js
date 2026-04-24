import { describe, expect, it } from "vitest";
import { useStorefrontAnnouncement } from "./useStorefrontAnnouncement.ts";

describe("useStorefrontAnnouncement", () => {
  it("syncs enabled announcement text and preserves manual dismissal", () => {
    const announcement = useStorefrontAnnouncement({
      getStorefrontUiSnapshot: () => ({
        settings: {
          announcement_enabled: "true",
          announcement: "第一行\\n第二行",
        },
      }),
    });

    announcement.refreshAnnouncementState();
    expect(announcement.announcementText.value).toBe("第一行\n第二行");
    expect(announcement.isAnnouncementVisible.value).toBe(true);

    announcement.closeAnnouncement();
    expect(announcement.isAnnouncementVisible.value).toBe(false);

    announcement.syncAnnouncementState({
      settings: {
        announcement_enabled: "true",
        announcement: "第一行\\n第二行",
      },
    });
    expect(announcement.isAnnouncementVisible.value).toBe(false);

    announcement.syncAnnouncementState({
      settings: {
        announcement_enabled: "true",
        announcement: "新公告",
      },
    });
    expect(announcement.isAnnouncementVisible.value).toBe(true);
  });

  it("hides disabled announcements", () => {
    const announcement = useStorefrontAnnouncement();

    announcement.syncAnnouncementState({
      settings: {
        announcement_enabled: "false",
        announcement: "不顯示",
      },
    });

    expect(announcement.announcementText.value).toBe("");
    expect(announcement.isAnnouncementVisible.value).toBe(false);
  });
});
