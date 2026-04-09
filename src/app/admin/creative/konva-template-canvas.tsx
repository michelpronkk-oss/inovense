"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";
import {
  CREATIVE_FORMAT_SPECS,
  type CreativeFormatId,
  type CreativeState,
  type ServiceLaneStyle,
} from "./types";

interface KonvaTemplateCanvasProps {
  state: CreativeState;
  format: CreativeFormatId;
  laneStyle: ServiceLaneStyle;
  accentStrength: number;
}

interface BaseTemplateProps extends KonvaTemplateCanvasProps {
  width: number;
  height: number;
  logoImage: HTMLImageElement | null;
}

const FONT_FAMILY = "Geist, Inter, system-ui, sans-serif";

export function KonvaTemplateCanvas(props: KonvaTemplateCanvasProps) {
  const formatSpec = CREATIVE_FORMAT_SPECS[props.format];
  const { containerRef, containerWidth } = useMeasuredWidth<HTMLDivElement>();
  const logoImage = useLoadedImage(props.state.showLogo ? "/logo.png" : undefined);

  const posterBackgroundImage = useLoadedImage(
    props.state.template === "poster_scene" ? "/work/silentspend/hero.png" : undefined,
  );
  const posterOverlayImage = useLoadedImage(
    props.state.template === "poster_scene" ? "/work/silentspend/evidence-view.png" : undefined,
  );

  const scale = containerWidth > 0 ? containerWidth / formatSpec.width : 1;

  return (
    <div ref={containerRef} className="h-full w-full">
      {containerWidth > 0 ? (
        <Stage
          width={formatSpec.width}
          height={formatSpec.height}
          scaleX={scale}
          scaleY={scale}
          style={{
            width: `${containerWidth}px`,
            height: `${formatSpec.height * scale}px`,
          }}
          listening={false}
        >
          <Layer>
            {props.state.template === "poster_scene" && (
              <PosterSceneLayer
                {...props}
                width={formatSpec.width}
                height={formatSpec.height}
                logoImage={logoImage}
                backgroundImage={posterBackgroundImage}
                overlayImage={posterOverlayImage}
              />
            )}

            {props.state.template === "campaign_cta" && (
              <CampaignCtaLayer
                {...props}
                width={formatSpec.width}
                height={formatSpec.height}
                logoImage={logoImage}
              />
            )}

            {props.state.template === "proof_metric" && (
              <ProofMetricLayer
                {...props}
                width={formatSpec.width}
                height={formatSpec.height}
                logoImage={logoImage}
              />
            )}
          </Layer>
        </Stage>
      ) : null}
    </div>
  );
}

function PosterSceneLayer({
  state,
  format,
  width,
  height,
  laneStyle,
  accentStrength,
  logoImage,
  backgroundImage,
  overlayImage,
}: BaseTemplateProps & {
  backgroundImage: HTMLImageElement | null;
  overlayImage: HTMLImageElement | null;
}) {
  const boardWidth =
    format === "story"
      ? width * 0.72
      : format === "portrait"
        ? width * 0.72
        : format === "square"
          ? width * 0.68
          : width * 0.58;
  const boardHeight =
    format === "landscape"
      ? height * 0.7
      : format === "story"
        ? height * 0.45
        : format === "portrait"
          ? height * 0.52
          : height * 0.57;
  const boardX = width * 0.1;
  const boardY = format === "landscape" ? height * 0.13 : height * 0.12;
  const boardPadding = Math.max(24, width * 0.028);

  const headlineSize =
    format === "story" ? 72 : format === "portrait" ? 58 : format === "square" ? 56 : 42;
  const subtitleSize =
    format === "story" ? 25 : format === "portrait" ? 21 : format === "square" ? 20 : 17;
  const chipSize =
    format === "story" ? 16 : format === "portrait" ? 14 : format === "square" ? 14 : 12;
  const chipHeight = chipSize + Math.max(18, width * 0.013);
  const chipGap = Math.max(12, width * 0.0085);

  const boardInnerWidth = boardWidth - boardPadding * 2;
  const tagTop = boardY + boardHeight - boardPadding - chipHeight - 58;
  const chips = ["Scope", "Strategy", state.ctaText || "Apply now"];
  const proof = state.proofBadge.trim() || "Limited intake";

  const heroCrop = computeCoverCrop(backgroundImage, width, height);
  const overlayCrop = computeCoverCrop(overlayImage, width, height);

  let chipX = boardX + boardPadding;

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#06070c" />
      {backgroundImage && heroCrop ? (
        <KonvaImage
          image={backgroundImage}
          x={0}
          y={0}
          width={width}
          height={height}
          crop={heroCrop}
          opacity={0.52}
        />
      ) : null}
      {overlayImage && overlayCrop ? (
        <KonvaImage
          image={overlayImage}
          x={0}
          y={0}
          width={width}
          height={height}
          crop={overlayCrop}
          opacity={0.16}
        />
      ) : null}
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(255,255,255,0.16)",
          0.45,
          "rgba(6,7,12,0.26)",
          1,
          "rgba(5,6,10,0.68)",
        ]}
      />
      <Rect
        x={boardX}
        y={boardY}
        width={boardWidth}
        height={boardHeight}
        cornerRadius={Math.max(10, width * 0.012)}
        fill="#f3f0e7"
        stroke="rgba(31,31,36,0.18)"
        strokeWidth={1}
        shadowColor="rgba(0,0,0,0.45)"
        shadowBlur={28}
        shadowOffsetY={16}
      />

      <Text
        x={boardX + boardPadding}
        y={boardY + boardPadding}
        width={boardInnerWidth}
        text={(state.eyebrow || "Poster on scene").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={Math.max(11, width * 0.009)}
        letterSpacing={1.8}
        fontStyle="600"
        fill="#63636d"
      />
      <Text
        x={boardX + boardPadding}
        y={boardY + boardPadding + Math.max(22, width * 0.018)}
        width={boardInnerWidth}
        text={state.title}
        fontFamily={FONT_FAMILY}
        fontSize={headlineSize}
        lineHeight={1.03}
        fontStyle="700"
        fill="#111115"
      />
      <Text
        x={boardX + boardPadding}
        y={boardY + boardPadding + boardHeight * 0.42}
        width={boardInnerWidth}
        text={state.subtitle}
        fontFamily={FONT_FAMILY}
        fontSize={subtitleSize}
        lineHeight={1.34}
        fill="#3f3f46"
      />

      {chips.map((chip, index) => {
        const isPrimary = index === 2;
        const chipWidth = Math.min(
          boardInnerWidth * (isPrimary ? 0.42 : 0.31),
          estimatePillWidth(chip, chipSize, Math.max(20, width * 0.014)),
        );
        const group = (
          <Group key={`${chip}:${index}`} x={chipX} y={tagTop}>
            <Rect
              width={chipWidth}
              height={chipHeight}
              cornerRadius={chipHeight / 2}
              fill={
                isPrimary
                  ? accentColor(laneStyle.accentRgb, 0.24 + accentStrength * 0.2)
                  : "rgba(255,255,255,0.52)"
              }
              stroke={
                isPrimary
                  ? accentColor(laneStyle.accentRgb, 0.62 + accentStrength * 0.16)
                  : "rgba(24,24,27,0.22)"
              }
              strokeWidth={1}
            />
            <Text
              x={0}
              y={(chipHeight - chipSize) / 2}
              width={chipWidth}
              align="center"
              text={chip.toUpperCase()}
              fontFamily={FONT_FAMILY}
              fontSize={chipSize}
              letterSpacing={1.1}
              fontStyle="700"
              fill={isPrimary ? "#0f1f20" : "#2f2f38"}
            />
          </Group>
        );

        chipX += chipWidth + chipGap;
        return group;
      })}

      <Line
        points={[
          boardX + boardPadding,
          boardY + boardHeight - boardPadding - 26,
          boardX + boardWidth - boardPadding,
          boardY + boardHeight - boardPadding - 26,
        ]}
        stroke="rgba(39,39,42,0.26)"
        strokeWidth={1}
      />
      <Text
        x={boardX + boardPadding}
        y={boardY + boardHeight - boardPadding - 16}
        width={boardInnerWidth}
        text={proof.toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={Math.max(11, width * 0.0087)}
        letterSpacing={1.4}
        fill="#63636f"
      />

      {state.showLogo && logoImage ? (
        <KonvaImage
          image={logoImage}
          x={width - width * 0.14}
          y={height - height * 0.1}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.9}
        />
      ) : null}
    </>
  );
}

function CampaignCtaLayer({
  state,
  format,
  width,
  height,
  laneStyle,
  accentStrength,
  logoImage,
}: BaseTemplateProps) {
  const padX = width * (format === "landscape" ? 0.074 : 0.085);
  const padY = height * (format === "story" ? 0.07 : 0.08);

  const headlineSize =
    format === "story" ? 92 : format === "portrait" ? 66 : format === "square" ? 62 : 54;
  const subtitleSize =
    format === "story" ? 29 : format === "portrait" ? 23 : format === "square" ? 22 : 18;
  const ctaSize = format === "story" ? 23 : format === "portrait" ? 18 : 16;
  const chipSize =
    format === "story" ? 16 : format === "portrait" ? 14 : format === "square" ? 13 : 12;

  const chipLabel = (state.eyebrow || "Campaign CTA").toUpperCase();
  const chipWidth = Math.min(
    width * (format === "landscape" ? 0.23 : 0.34),
    estimatePillWidth(chipLabel, chipSize, Math.max(14, width * 0.012)),
  );

  const ctaWidth = width * (format === "landscape" ? 0.58 : 0.8);
  const ctaHeight = height * (format === "landscape" ? 0.12 : 0.09);
  const ctaX = padX;
  const ctaY = height - padY - ctaHeight;

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#060811" />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(16,14,38,0.95)",
          0.55,
          "rgba(8,9,20,0.97)",
          1,
          "rgba(5,6,12,1)",
        ]}
      />
      <Circle
        x={width * 0.84}
        y={height * 0.16}
        radius={Math.max(180, width * 0.31)}
        fill={accentColor(laneStyle.accentRgb, 0.36 + accentStrength * 0.24)}
      />
      <Circle
        x={width * 0.18}
        y={height * 0.88}
        radius={Math.max(210, width * 0.28)}
        fill="rgba(120, 80, 162, 0.24)"
      />
      <Rect
        x={0}
        y={0}
        width={width}
        height={2}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: 0 }}
        fillLinearGradientColorStops={[
          0,
          "rgba(255,255,255,0)",
          0.5,
          accentColor(laneStyle.accentRgb, 0.72),
          1,
          "rgba(255,255,255,0)",
        ]}
      />

      <Rect
        x={padX}
        y={padY}
        width={chipWidth}
        height={chipSize + 18}
        cornerRadius={(chipSize + 18) / 2}
        fill="rgba(4,7,14,0.58)"
        stroke="rgba(156,163,175,0.52)"
        strokeWidth={1}
      />
      <Text
        x={padX}
        y={padY + 8}
        width={chipWidth}
        align="center"
        text={chipLabel}
        fontFamily={FONT_FAMILY}
        fontSize={chipSize}
        letterSpacing={1.5}
        fontStyle="700"
        fill="#d4d4d8"
      />
      <Text
        x={width - padX - width * 0.24}
        y={padY + 10}
        width={width * 0.24}
        align="right"
        text={(state.proofBadge.trim() || "LIMITED INTAKE").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={chipSize}
        letterSpacing={1.4}
        fill="rgba(161,161,170,0.92)"
      />

      <Text
        x={padX}
        y={padY + chipSize + 34}
        width={width * (format === "landscape" ? 0.73 : 0.84)}
        text={state.title}
        fontFamily={FONT_FAMILY}
        fontSize={headlineSize}
        lineHeight={1.03}
        fontStyle="700"
        fill="#f4f4f5"
      />
      <Text
        x={padX}
        y={padY + chipSize + 34 + headlineSize * 2.18}
        width={width * (format === "landscape" ? 0.62 : 0.78)}
        text={state.subtitle}
        fontFamily={FONT_FAMILY}
        fontSize={subtitleSize}
        lineHeight={1.32}
        fill="rgba(228,228,231,0.82)"
      />

      <Rect
        x={ctaX}
        y={ctaY}
        width={ctaWidth}
        height={ctaHeight}
        cornerRadius={Math.min(20, ctaHeight / 2)}
        fill={accentColor(laneStyle.accentRgb, 0.28 + accentStrength * 0.24)}
        stroke={accentColor(laneStyle.accentRgb, 0.75)}
        strokeWidth={1}
        shadowColor={accentColor(laneStyle.accentRgb, 0.32 + accentStrength * 0.2)}
        shadowBlur={24}
        shadowOffsetY={10}
      />
      <Text
        x={ctaX + Math.max(18, width * 0.016)}
        y={ctaY + (ctaHeight - ctaSize) / 2}
        width={ctaWidth - Math.max(54, width * 0.04)}
        text={(state.ctaText || "Book system audit").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={ctaSize}
        letterSpacing={1.4}
        fontStyle="700"
        fill="#f8fafc"
      />
      <Text
        x={ctaX + ctaWidth - Math.max(40, width * 0.03)}
        y={ctaY + (ctaHeight - ctaSize) / 2}
        width={24}
        text=">"
        fontFamily={FONT_FAMILY}
        fontSize={ctaSize + 2}
        fontStyle="700"
        fill="#f8fafc"
      />

      {state.showLogo && logoImage ? (
        <KonvaImage
          image={logoImage}
          x={width - width * 0.135}
          y={height - height * 0.085}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.92}
        />
      ) : null}
    </>
  );
}

function ProofMetricLayer({
  state,
  format,
  width,
  height,
  laneStyle,
  accentStrength,
  logoImage,
}: BaseTemplateProps) {
  const isLandscape = format === "landscape";
  const padX = width * 0.07;
  const padY = height * 0.08;
  const metric = state.proofBadge.trim() || defaultMetricFromTitle(state.title);
  const eyebrowSize = isLandscape ? 12 : 14;
  const metricSize = isLandscape ? 124 : format === "portrait" ? 140 : 132;
  const titleSize = isLandscape ? 46 : format === "portrait" ? 58 : 56;
  const bodySize = isLandscape ? 17 : format === "portrait" ? 22 : 20;
  const chipSize = isLandscape ? 12 : 14;

  const metricWidth = isLandscape ? width * 0.35 : width * 0.52;
  const copyX = isLandscape ? padX + metricWidth + width * 0.05 : padX;
  const copyY = isLandscape ? padY + 38 : padY + metricSize + 78;

  const bars = [0.42, 0.5, 0.56, 0.62, 0.72, 0.81];
  const barBaseY = height - padY - 74;
  const barAreaHeight = Math.max(56, height * 0.09);
  const barWidth = (width - padX * 2 - 12 * (bars.length - 1)) / bars.length;

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#05060c" />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(14,16,25,0.94)",
          0.55,
          "rgba(7,8,15,0.98)",
          1,
          "rgba(4,5,10,1)",
        ]}
      />
      <Circle
        x={width * 0.16}
        y={height * 0.2}
        radius={Math.max(120, width * 0.19)}
        fill={accentColor(laneStyle.accentRgb, 0.24 + accentStrength * 0.2)}
      />
      <Circle
        x={width * 0.86}
        y={height * 0.84}
        radius={Math.max(130, width * 0.17)}
        fill="rgba(99, 102, 241, 0.14)"
      />

      <Text
        x={padX}
        y={padY}
        width={width - padX * 2}
        text={(state.eyebrow || "Proof metric").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={eyebrowSize}
        letterSpacing={1.8}
        fontStyle="600"
        fill="rgba(161,161,170,0.95)"
      />
      <Text
        x={padX}
        y={padY + 24}
        width={metricWidth}
        text={metric}
        fontFamily={FONT_FAMILY}
        fontSize={metricSize}
        lineHeight={0.9}
        fontStyle="700"
        fill="#f4f4f5"
      />
      <Text
        x={padX}
        y={padY + 24 + metricSize * 0.95}
        width={metricWidth}
        text="OUTCOME SPOTLIGHT"
        fontFamily={FONT_FAMILY}
        fontSize={eyebrowSize}
        letterSpacing={1.5}
        fill="rgba(161,161,170,0.95)"
      />

      <Group x={padX} y={padY + 24 + metricSize * 0.95 + 24}>
        <Rect
          width={metricWidth * 0.44}
          height={chipSize + 18}
          cornerRadius={10}
          fill="rgba(24,24,27,0.68)"
          stroke="rgba(113,113,122,0.44)"
          strokeWidth={1}
        />
        <Text
          y={9}
          width={metricWidth * 0.44}
          text="BEFORE: 6H AVG"
          align="center"
          fontFamily={FONT_FAMILY}
          fontSize={chipSize}
          letterSpacing={1}
          fill="rgba(212,212,216,0.86)"
        />
        <Rect
          x={metricWidth * 0.44 + 12}
          width={metricWidth * 0.44}
          height={chipSize + 18}
          cornerRadius={10}
          fill="rgba(24,24,27,0.68)"
          stroke="rgba(113,113,122,0.44)"
          strokeWidth={1}
        />
        <Text
          x={metricWidth * 0.44 + 12}
          y={9}
          width={metricWidth * 0.44}
          text="AFTER: 58M AVG"
          align="center"
          fontFamily={FONT_FAMILY}
          fontSize={chipSize}
          letterSpacing={1}
          fill="rgba(212,212,216,0.86)"
        />
      </Group>

      <Text
        x={copyX}
        y={copyY}
        width={width - copyX - padX}
        text={state.title}
        fontFamily={FONT_FAMILY}
        fontSize={titleSize}
        lineHeight={1.04}
        fontStyle="700"
        fill="#f5f5f7"
      />
      <Text
        x={copyX}
        y={copyY + titleSize * 2.12}
        width={width - copyX - padX}
        text={state.subtitle}
        fontFamily={FONT_FAMILY}
        fontSize={bodySize}
        lineHeight={1.32}
        fill="rgba(228,228,231,0.83)"
      />

      <Line
        points={[padX, barBaseY, width - padX, barBaseY]}
        stroke="rgba(113,113,122,0.54)"
        strokeWidth={1}
      />
      {bars.map((value, index) => {
        const barHeight = barAreaHeight * value;
        const x = padX + index * (barWidth + 12);
        const y = barBaseY - barHeight;
        const highlight = index >= bars.length - 2;
        return (
          <Rect
            key={`bar:${index}`}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            cornerRadius={4}
            fill={accentColor(laneStyle.accentRgb, highlight ? 0.82 : 0.45)}
          />
        );
      })}

      <Rect
        x={width - padX - width * 0.31}
        y={height - padY - 42}
        width={width * 0.31}
        height={34}
        cornerRadius={17}
        fill={accentColor(laneStyle.accentRgb, 0.24 + accentStrength * 0.2)}
        stroke={accentColor(laneStyle.accentRgb, 0.62)}
        strokeWidth={1}
      />
      <Text
        x={width - padX - width * 0.31}
        y={height - padY - 31}
        width={width * 0.31}
        text={(state.ctaText || "View methodology").toUpperCase()}
        align="center"
        fontFamily={FONT_FAMILY}
        fontSize={chipSize}
        letterSpacing={1.2}
        fontStyle="700"
        fill="#f5f5f7"
      />

      {state.showLogo && logoImage ? (
        <KonvaImage
          image={logoImage}
          x={width - width * 0.135}
          y={height - height * 0.1}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.92}
        />
      ) : null}
    </>
  );
}

function useLoadedImage(src?: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!src) return;

    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return image;
}

function useMeasuredWidth<T extends HTMLElement>() {
  const containerRef = useRef<T | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const updateWidth = () => {
      const next = node.clientWidth;
      setContainerWidth(next > 0 ? next : 0);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { containerRef, containerWidth };
}

function estimatePillWidth(text: string, fontSize: number, horizontalPadding: number) {
  return text.length * fontSize * 0.58 + horizontalPadding * 2;
}

function defaultMetricFromTitle(title: string) {
  const match = title.match(/[+-]?\d+%/);
  return match?.[0] ?? "+38%";
}

function accentColor(accentRgb: string, alpha: number) {
  const [r, g, b] = accentRgb.split(" ").map((part) => Number(part));
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

function computeCoverCrop(image: HTMLImageElement | null, targetWidth: number, targetHeight: number) {
  if (!image) return null;

  const imageRatio = image.width / image.height;
  const targetRatio = targetWidth / targetHeight;

  if (imageRatio > targetRatio) {
    const cropWidth = image.height * targetRatio;
    return {
      x: (image.width - cropWidth) / 2,
      y: 0,
      width: cropWidth,
      height: image.height,
    };
  }

  const cropHeight = image.width / targetRatio;
  return {
    x: 0,
    y: (image.height - cropHeight) / 2,
    width: image.width,
    height: cropHeight,
  };
}
