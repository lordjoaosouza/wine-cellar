import {
  ImpactFeedbackStyle,
  impactAsync,
  NotificationFeedbackType,
  notificationAsync,
  selectionAsync,
} from "expo-haptics";

function fire(action: () => Promise<void>) {
  void action().catch(() => {
    // ignore
  });
}

export const haptics = {
  confirm: () => fire(() => impactAsync(ImpactFeedbackStyle.Medium)),
  remove: () => fire(() => notificationAsync(NotificationFeedbackType.Warning)),
  select: () => fire(() => selectionAsync()),
  success: () =>
    fire(() => notificationAsync(NotificationFeedbackType.Success)),
  tap: () => fire(() => impactAsync(ImpactFeedbackStyle.Light)),
  warning: () =>
    fire(() => notificationAsync(NotificationFeedbackType.Warning)),
};
