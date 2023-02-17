import React, {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  GestureResponderEvent,
  PanResponder,
  PanResponderGestureState,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

interface Props {
  allowDragAboveMaxHeight?: boolean;
  allowDragToClose?: boolean;
  allowOnlyHeaderToDrag?: boolean;
  allowTapOverlayToClose?: boolean;
  children?: ReactNode;
  contentStyle?: ViewStyle;
  disabled?: boolean;
  headerContent?: ReactNode;
  headerContentStyle?: ViewStyle;
  headerStyle?: ViewStyle;
  heightToClose?: number | string;
  heightToChangeIndex?: string;
  minimunDistanceToStart?: number;
  onClose: () => void;
  onIndexChanged?: (index: number) => void;
  onMoving?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void;
  onMovingEnded?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void;
  onMovingStarted?: (
    e: GestureResponderEvent,
    gestureState: PanResponderGestureState
  ) => void;
  overlayStyle?: ViewStyle;
  showHeader?: boolean;
  showOverlay?: boolean;
  slidePosition?: "top" | "bottom";
  slideSpeed?: number;
  snapPoints?: (string | number)[];
  speedToChangeIndex?: number;
  speedToClose?: number;
  speedToLastIndex?: number;
  style?: ViewStyle;
  visible: boolean;
}

export interface SlidingSheetRef {
  currentHeight(): number;
  currentSnapPoint(): number;
  currentSnapPointHeight(): number;
  goToSnapPoint(snapPoint: number): void;
}

export const SlidingSheet = forwardRef<SlidingSheetRef, Props>(
  (
    {
      allowDragAboveMaxHeight = true,
      allowDragToClose,
      allowOnlyHeaderToDrag,
      allowTapOverlayToClose,
      children,
      contentStyle,
      disabled,
      headerContent,
      headerContentStyle,
      headerStyle,
      heightToChangeIndex = "50%",
      heightToClose = "1%",
      minimunDistanceToStart = 50,
      onClose,
      onIndexChanged,
      onMoving,
      onMovingEnded,
      onMovingStarted,
      overlayStyle,
      showHeader = true,
      showOverlay = true,
      slidePosition = "bottom",
      slideSpeed = 20,
      snapPoints = ["20%", "50%", "85%"],
      speedToChangeIndex = 1,
      speedToClose = 10,
      speedToLastIndex = 5,
      style,
      visible,
    },
    ref
  ) => {
    const getPercentValue = (value: string) => {
      const percent = value.split("%")[0];
      return +percent / 100;
    };

    const getHeight = (value: number | string) => {
      if (typeof value === "number") {
        return value;
      }
      return SCREEN_HEIGHT * getPercentValue(value);
    };
    const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
      Dimensions.get("screen");
    const headerHeight = 20;
    const [animation] = useState(new Animated.Value(getHeight(snapPoints[0])));
    const offSet = useRef(getHeight(snapPoints[0]));
    const index = useRef(0);
    const loading = useRef(false);
    const currentDy = useRef(0);

    useImperativeHandle(ref, () => ({
      currentSnapPoint: () => index.current,
      currentSnapPointHeight: () => offSet.current,
      currentHeight: () => offSet.current + currentDy.current,
      goToSnapPoint,
    }));

    useEffect(() => {
      if (typeof onIndexChanged === "function") {
        onIndexChanged(index.current);
      }
    }, [index.current]);

    useEffect(() => {
      if (visible) {
        goToSnapPoint(0);
      }
    }, [visible]);

    const panResponder = useRef(
      PanResponder.create({
        onMoveShouldSetPanResponder: (e, gestureState) => {
          const enabled =
            (gestureState.dy > minimunDistanceToStart ||
              gestureState.dy < -minimunDistanceToStart) &&
            (allowDragToClose || gestureState.dy < 0 || index.current !== 0) &&
            (allowDragAboveMaxHeight ||
              gestureState.dy > 0 ||
              index.current !== snapPoints.length - 1) &&
            !loading.current &&
            !disabled;
          if (typeof onMovingStarted === "function" && enabled) {
            onMovingStarted(e, gestureState);
          }
          return enabled;
        },
        onPanResponderMove: (e, gestureState) => {
          if (
            !loading.current &&
            (allowDragToClose || gestureState.dy < 0 || index.current !== 0) &&
            (allowDragAboveMaxHeight ||
              gestureState.dy > 0 ||
              index.current !== snapPoints.length - 1)
          ) {
            if (typeof onMoving === "function") {
              onMoving(e, gestureState);
            }
            currentDy.current =
              gestureState.dy * (slidePosition === "bottom" ? -1 : 1);
            animation.setValue(offSet.current + currentDy.current);
          }
        },
        onPanResponderRelease: (e, gestureState) => {
          if (
            (allowDragToClose || gestureState.dy < 0 || index.current !== 0) &&
            (allowDragAboveMaxHeight ||
              gestureState.dy > 0 ||
              index.current !== snapPoints.length - 1)
          ) {
            loading.current = true;
            let { dy, vy } = gestureState;
            const position = getPosition(dy);
            const distanceIndex = getIndex(position);
            let newIndex = -1;
            vy *= slidePosition === "top" ? -1 : 1;
            switch (true) {
              case allowDragToClose &&
                (vy > speedToClose || position < getHeight(heightToClose)):
                close(e, gestureState);
                break;
              case vy < -speedToLastIndex:
                newIndex = snapPoints.length - 1;
                break;
              case vy > speedToLastIndex:
                newIndex = 0;
                break;
              case vy < -speedToChangeIndex &&
                distanceIndex < index.current + 1 &&
                index.current < snapPoints.length - 1:
                newIndex = index.current + 1;
                break;
              case vy > speedToChangeIndex &&
                distanceIndex > index.current - 1 &&
                index.current > -2:
                newIndex = index.current - 1;
                break;
            }
            if (newIndex === -1) {
              newIndex = distanceIndex;
            }
            const newPosition = getHeight(snapPoints[newIndex]);
            setTimeout(() => {
              index.current = newIndex;
              offSet.current = newPosition;
              if (typeof onMovingEnded === "function" && e && gestureState) {
                onMovingEnded(e, gestureState);
              }
              loading.current = false;
            }, getTime(Math.abs(position - newPosition)));
            Animated.spring(animation, {
              toValue: newPosition,
              speed: 20,
              useNativeDriver: false,
            }).start();
          }
        },
      })
    ).current;

    const contentHandler = useMemo(
      () => (allowOnlyHeaderToDrag ? {} : panResponder?.panHandlers),
      [allowOnlyHeaderToDrag, panResponder]
    );

    const getPosition = (dy: number) => {
      return offSet.current + dy * (slidePosition === "bottom" ? -1 : 1);
    };

    const getIndex = (position: number) => {
      for (let i = snapPoints.length - 1; i > 0; i--) {
        if (
          (getHeight(snapPoints[i]) + getHeight(snapPoints[i - 1])) *
            getPercentValue(heightToChangeIndex) <
          position
        ) {
          return i;
        }
      }
      return 0;
    };

    const getTime = (distance: number) => {
      return distance / slideSpeed;
    };

    const close = (
      e?: GestureResponderEvent,
      gestureState?: PanResponderGestureState
    ) => {
      offSet.current = 0;
      currentDy.current = 0;
      animation.setOffset(0);
      animation.setValue(0);
      if (typeof onMovingEnded === "function" && e && gestureState) {
        onMovingEnded(e, gestureState);
      }
      onClose();
    };

    const goToSnapPoint = (snapPoint: number) => {
      if (snapPoint > -1 && snapPoint < snapPoints.length) {
        loading.current = true;
        const newHeight = getHeight(snapPoints[snapPoint]);
        setTimeout(() => {
          index.current = snapPoint;
          offSet.current = newHeight;
          currentDy.current = 0;
          loading.current = false;
        }, newHeight);
        Animated.spring(animation, {
          toValue: newHeight,
          speed: slideSpeed,
          useNativeDriver: false,
        }).start();
      }
    };

    if (!visible) {
      return <></>;
    }

    return (
      <>
        {showOverlay && (
          <View
            style={[
              {
                backgroundColor: "black",
                opacity: 0.3,
                height: SCREEN_HEIGHT,
                width: SCREEN_WIDTH,
                position: "absolute",
              },
              overlayStyle,
            ]}
          >
            {allowTapOverlayToClose && (
              <TouchableOpacity
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                onPress={() => close()}
              />
            )}
          </View>
        )}
        <Animated.View
          style={[
            {
              backgroundColor: "#172733",
              width: SCREEN_WIDTH,
              position: "absolute",
              bottom: slidePosition === "bottom" ? 0 : undefined,
              top: slidePosition === "top" ? 0 : undefined,
              borderTopEndRadius: slidePosition === "bottom" ? 20 : 0,
              borderTopStartRadius: slidePosition === "bottom" ? 20 : 0,
              borderBottomEndRadius: slidePosition === "top" ? 20 : 0,
              borderBottomStartRadius: slidePosition === "top" ? 20 : 0,
              alignItems: "center",
            },
            style,
            { height: animation, maxHeight: animation },
          ]}
          {...contentHandler}
        >
          {showHeader && (
            <View
              style={[
                {
                  position: "absolute",
                  width: SCREEN_WIDTH,
                  height: headerHeight,
                  alignItems: "center",
                  justifyContent: "center",
                  bottom: slidePosition === "top" ? -headerHeight : undefined,
                  top: slidePosition === "bottom" ? -headerHeight : undefined,
                },
                headerStyle,
              ]}
              {...panResponder.panHandlers}
            >
              {headerContent ?? (
                <View
                  style={[
                    {
                      width: "15%",
                      height: 5,
                      backgroundColor: "white",
                      borderRadius: 5,
                    },
                    headerContentStyle,
                  ]}
                />
              )}
            </View>
          )}
          <View
            style={[
              {
                position: "absolute",
                height: "100%",
                width: "100%",
                padding: 10,
                alignItems: "center",
              },
              contentStyle,
            ]}
          >
            {children}
          </View>
        </Animated.View>
      </>
    );
  }
);
