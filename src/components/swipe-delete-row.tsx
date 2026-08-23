import { type ReactNode, useCallback, useRef } from "react";
import {
  type AccessibilityActionEvent,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Swipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { AnimatedPressable } from "@/components/animated-pressable";
import { Icon } from "@/components/icon";
import { Palette, Shadows } from "@/constants/theme";
import { confirmDelete } from "@/utils/confirm-delete";
import { haptics } from "@/utils/haptics";

const ACTION_WIDTH = 92;

export interface SwipeDeleteExclusiveRef {
  current: SwipeableMethods | null;
}

export function SwipeDeleteRow({
  accessibilityLabel,
  children,
  exclusiveRef,
  onDelete,
}: {
  accessibilityLabel: string;
  children: ReactNode;
  exclusiveRef: SwipeDeleteExclusiveRef;
  onDelete: () => void;
}) {
  const swipeableRef = useRef<SwipeableMethods | null>(null);

  const claimRow = useCallback(() => {
    const open = exclusiveRef.current;
    if (open && open !== swipeableRef.current) {
      open.close();
    }
    exclusiveRef.current = swipeableRef.current;
  }, [exclusiveRef]);

  const handleDelete = useCallback(async () => {
    const confirmed = await confirmDelete({
      message: "This can't be undone.",
      title: accessibilityLabel,
    });
    if (!confirmed) {
      swipeableRef.current?.close();
      return;
    }
    if (exclusiveRef.current === swipeableRef.current) {
      exclusiveRef.current = null;
    }
    haptics.remove();
    onDelete();
  }, [accessibilityLabel, exclusiveRef, onDelete]);

  const handleDeletePress = useCallback(() => {
    void handleDelete();
  }, [handleDelete]);

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === "delete") {
        void handleDelete();
      }
    },
    [handleDelete]
  );

  const handleSwipeableClose = useCallback(() => {
    if (exclusiveRef.current === swipeableRef.current) {
      exclusiveRef.current = null;
    }
  }, [exclusiveRef]);

  const renderRightActions = useCallback(
    () => (
      <AnimatedPressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={handleDeletePress}
        scaleTo={0.94}
        style={styles.deleteAction}
      >
        <Icon color={Palette.white} name="trash" size={18} />
        <Text style={styles.deleteLabel}>Delete</Text>
      </AnimatedPressable>
    ),
    [accessibilityLabel, handleDeletePress]
  );

  return (
    <View
      accessibilityActions={[{ label: "Delete", name: "delete" }]}
      onAccessibilityAction={handleAccessibilityAction}
      style={styles.shadow}
    >
      <Swipeable
        containerStyle={styles.container}
        enableTrackpadTwoFingerGesture
        friction={2}
        onSwipeableClose={handleSwipeableClose}
        onSwipeableOpenStartDrag={claimRow}
        overshootRight={false}
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        rightThreshold={40}
      >
        {children}
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Palette.wine,
    borderRadius: 22,
    overflow: "hidden",
  },
  deleteAction: {
    alignItems: "center",
    backgroundColor: Palette.wine,
    gap: 6,
    height: "100%",
    justifyContent: "center",
    width: ACTION_WIDTH,
  },
  deleteLabel: {
    color: Palette.white,
    fontSize: 13,
    fontWeight: "700",
  },
  shadow: {
    backgroundColor: Palette.white,
    borderRadius: 22,
    ...Shadows.card,
  },
});
