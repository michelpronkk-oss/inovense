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

interface TemplateLayerProps extends KonvaTemplateCanvasProps {
  width: number;
  height: number;
  assets: CreativeAssets;
}

interface CreativeAssets {
  logo: HTMLImageElement | null;
  hero: HTMLImageElement | null;
  evidence: HTMLImageElement | null;
  signal: HTMLImageElement | null;
  workflow: HTMLImageElement | null;
}

interface PillProps {
  x: number;
  y: number;
  text: string;
  fontSize: number;
  fill: string;
  stroke: string;
  textColor: string;
  width?: number;
  paddingX?: number;
  paddingY?: number;
}

interface CoverImageProps {
  image: HTMLImageElement | null;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  radius?: number;
}

const FONT_FAMILY = "Geist, Inter, system-ui, sans-serif";

export function KonvaTemplateCanvas(props: KonvaTemplateCanvasProps) {
  const formatSpec = CREATIVE_FORMAT_SPECS[props.format];
  const { containerRef, containerWidth } = useMeasuredWidth<HTMLDivElement>();

  const assets: CreativeAssets = {
    logo: useLoadedImage(props.state.showLogo ? "/logo.png" : undefined),
    hero: useLoadedImage("/work/silentspend/hero.png"),
    evidence: useLoadedImage("/work/silentspend/evidence-view.png"),
    signal: useLoadedImage("/work/silentspend/signal-feed.png"),
    workflow: useLoadedImage("/work/silentspend/workflow-view.png"),
  };

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
            {renderTemplateLayer({
              ...props,
              width: formatSpec.width,
              height: formatSpec.height,
              assets,
            })}
          </Layer>
        </Stage>
      ) : null}
    </div>
  );
}

function renderTemplateLayer(props: TemplateLayerProps) {
  switch (props.state.template) {
    case "poster_scene":
      return <PosterSceneLayer {...props} />;
    case "campaign_cta":
      return <CampaignCtaLayer {...props} />;
    case "proof_metric":
      return <ProofMetricLayer {...props} />;
    case "editorial_frame":
      return <EditorialFrameLayer {...props} />;
    case "gradient_statement":
      return <GradientStatementLayer {...props} />;
    default:
      return null;
  }
}

function PosterSceneLayer({
  state,
  format,
  width,
  height,
  laneStyle,
  accentStrength,
  assets,
}: TemplateLayerProps) {
  const posterWidth =
    format === "story"
      ? width * 0.74
      : format === "portrait"
        ? width * 0.72
        : format === "square"
          ? width * 0.69
          : width * 0.56;
  const posterHeight =
    format === "landscape"
      ? height * 0.74
      : format === "story"
        ? height * 0.43
        : format === "portrait"
          ? height * 0.5
          : height * 0.56;

  const posterX = width * (format === "landscape" ? 0.08 : 0.1);
  const posterY = height * (format === "landscape" ? 0.12 : 0.13);
  const posterPadding = Math.max(24, width * 0.026);
  const posterRotation = format === "story" ? -2.2 : -1.5;
  const titleSize =
    format === "story" ? 74 : format === "portrait" ? 58 : format === "square" ? 54 : 41;
  const subtitleSize =
    format === "story" ? 25 : format === "portrait" ? 21 : format === "square" ? 20 : 16;
  const pillSize = format === "story" ? 15 : format === "portrait" ? 14 : 12;
  const boardAccent = accentColor(laneStyle.accentRgb, 0.22 + accentStrength * 0.2);

  const cardInnerWidth = posterWidth - posterPadding * 2;
  const tagY = posterY + posterHeight - posterPadding - 66;
  const proof = (state.proofBadge.trim() || "Limited intake").toUpperCase();

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#06070c" />
      <CoverImage image={assets.hero} x={0} y={0} width={width} height={height} opacity={0.58} />
      <CoverImage image={assets.evidence} x={0} y={0} width={width} height={height} opacity={0.16} />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: 0, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(255,255,255,0.12)",
          0.42,
          "rgba(6,7,12,0.24)",
          1,
          "rgba(6,7,12,0.72)",
        ]}
      />
      <Circle
        x={width * 0.76}
        y={height * 0.12}
        radius={Math.max(170, width * 0.19)}
        fill={accentColor(laneStyle.accentRgb, 0.18 + accentStrength * 0.14)}
      />

      <Group x={posterX} y={posterY} rotation={posterRotation}>
        <Rect
          width={posterWidth}
          height={posterHeight}
          cornerRadius={Math.max(10, width * 0.01)}
          fill="#f2efe7"
          stroke="rgba(24,24,27,0.16)"
          strokeWidth={1}
          shadowColor="rgba(0,0,0,0.48)"
          shadowBlur={30}
          shadowOffsetY={18}
          shadowOffsetX={8}
        />
        <Rect
          x={0}
          y={0}
          width={posterWidth}
          height={10}
          fill={boardAccent}
          cornerRadius={[10, 10, 0, 0]}
        />

        <Text
          x={posterPadding}
          y={posterPadding}
          width={cardInnerWidth}
          text={(state.eyebrow || "Poster on scene").toUpperCase()}
          fontFamily={FONT_FAMILY}
          fontSize={Math.max(11, width * 0.0087)}
          fontStyle="600"
          letterSpacing={1.7}
          fill="#66666f"
        />
        <Text
          x={posterPadding}
          y={posterPadding + 24}
          width={cardInnerWidth}
          text={state.title}
          fontFamily={FONT_FAMILY}
          fontSize={titleSize}
          lineHeight={1.02}
          fontStyle="700"
          fill="#121217"
        />
        <Text
          x={posterPadding}
          y={posterPadding + posterHeight * 0.4}
          width={cardInnerWidth * 0.76}
          text={state.subtitle}
          fontFamily={FONT_FAMILY}
          fontSize={subtitleSize}
          lineHeight={1.32}
          fill="#3f3f46"
        />

        <Rect
          x={posterWidth - posterPadding - cardInnerWidth * 0.35}
          y={posterHeight * 0.54}
          width={cardInnerWidth * 0.35}
          height={posterHeight * 0.19}
          cornerRadius={10}
          fill="rgba(255,255,255,0.45)"
          stroke="rgba(39,39,42,0.2)"
          strokeWidth={1}
        />
        <CoverImage
          image={assets.workflow}
          x={posterWidth - posterPadding - cardInnerWidth * 0.35 + 2}
          y={posterHeight * 0.54 + 2}
          width={cardInnerWidth * 0.35 - 4}
          height={posterHeight * 0.19 - 4}
          radius={8}
          opacity={1}
        />

        <Pill
          x={posterPadding}
          y={tagY - posterY}
          text="SCOPE"
          fontSize={pillSize}
          fill="rgba(255,255,255,0.56)"
          stroke="rgba(39,39,42,0.26)"
          textColor="#3f3f46"
        />
        <Pill
          x={posterPadding + estimatePillWidth("SCOPE", pillSize, 18) + 12}
          y={tagY - posterY}
          text="STRATEGY"
          fontSize={pillSize}
          fill="rgba(255,255,255,0.56)"
          stroke="rgba(39,39,42,0.26)"
          textColor="#3f3f46"
        />
        <Pill
          x={posterPadding + estimatePillWidth("SCOPE", pillSize, 18) + estimatePillWidth("STRATEGY", pillSize, 18) + 24}
          y={tagY - posterY}
          text={(state.ctaText || "Apply now").toUpperCase()}
          fontSize={pillSize}
          fill={accentColor(laneStyle.accentRgb, 0.3 + accentStrength * 0.2)}
          stroke={accentColor(laneStyle.accentRgb, 0.64)}
          textColor="#0f2628"
        />

        <Line
          points={[
            posterPadding,
            posterHeight - posterPadding - 24,
            posterWidth - posterPadding,
            posterHeight - posterPadding - 24,
          ]}
          stroke="rgba(39,39,42,0.24)"
          strokeWidth={1}
        />
        <Text
          x={posterPadding}
          y={posterHeight - posterPadding - 14}
          width={cardInnerWidth}
          text={proof}
          fontFamily={FONT_FAMILY}
          fontSize={Math.max(10, width * 0.008)}
          letterSpacing={1.3}
          fill="#666671"
        />
      </Group>

      {state.showLogo && assets.logo ? (
        <KonvaImage
          image={assets.logo}
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
  assets,
}: TemplateLayerProps) {
  const landscape = format === "landscape";
  const padX = width * (landscape ? 0.064 : 0.08);
  const padY = height * 0.08;
  const headlineSize =
    format === "story" ? 96 : format === "portrait" ? 68 : format === "square" ? 64 : 56;
  const bodySize =
    format === "story" ? 29 : format === "portrait" ? 22 : format === "square" ? 21 : 18;
  const metaSize = format === "story" ? 15 : format === "portrait" ? 13 : 12;
  const ctaSize = format === "story" ? 24 : format === "portrait" ? 18 : 16;
  const proof = (state.proofBadge.trim() || "Response in 24h").toUpperCase();
  const ghostWord =
    state.serviceLane === "General" ? "INOVENSE" : state.serviceLane.toUpperCase();

  const sidePanelWidth = landscape ? width * 0.31 : width * 0.86;
  const sidePanelX = landscape ? width - sidePanelWidth : padX;
  const sidePanelY = landscape ? 0 : height - height * 0.22;
  const sidePanelHeight = landscape ? height : height * 0.16;

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#060710" />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(12,13,31,0.96)",
          0.45,
          "rgba(7,9,22,0.99)",
          1,
          "rgba(5,6,12,1)",
        ]}
      />
      <Circle
        x={width * 0.82}
        y={height * 0.18}
        radius={Math.max(190, width * 0.25)}
        fill={accentColor(laneStyle.accentRgb, 0.32 + accentStrength * 0.22)}
      />
      <Circle
        x={width * 0.18}
        y={height * 0.86}
        radius={Math.max(180, width * 0.23)}
        fill="rgba(125,95,179,0.24)"
      />
      {Array.from({ length: 7 }).map((_, index) => (
        <Line
          key={`campaign-line-${index}`}
          points={[0, height * (0.14 + index * 0.12), width, height * (0.06 + index * 0.12)]}
          stroke="rgba(161,161,170,0.065)"
          strokeWidth={1}
        />
      ))}
      <Text
        x={-width * 0.01}
        y={height * (landscape ? 0.16 : 0.23)}
        text={ghostWord}
        fontFamily={FONT_FAMILY}
        fontSize={Math.max(120, width * 0.14)}
        fontStyle="700"
        letterSpacing={2.6}
        fill="rgba(244,244,245,0.05)"
      />

      <Pill
        x={padX}
        y={padY}
        text={(state.eyebrow || "Ad visual").toUpperCase()}
        fontSize={metaSize}
        fill="rgba(7,10,18,0.65)"
        stroke="rgba(161,161,170,0.44)"
        textColor="#d4d4d8"
      />
      <Text
        x={width - padX - width * 0.22}
        y={padY + 8}
        width={width * 0.22}
        align="right"
        text={proof}
        fontFamily={FONT_FAMILY}
        fontSize={metaSize}
        letterSpacing={1.4}
        fill="rgba(212,212,216,0.9)"
      />

      <Text
        x={padX}
        y={padY + 40}
        width={landscape ? width * 0.61 : width * 0.84}
        text={state.title}
        fontFamily={FONT_FAMILY}
        fontSize={headlineSize}
        lineHeight={1.01}
        fontStyle="700"
        fill="#f4f4f5"
      />
      <Text
        x={padX}
        y={padY + 40 + headlineSize * (landscape ? 1.94 : 2.18)}
        width={landscape ? width * 0.52 : width * 0.78}
        text={state.subtitle}
        fontFamily={FONT_FAMILY}
        fontSize={bodySize}
        lineHeight={1.3}
        fill="rgba(228,228,231,0.84)"
      />

      <Rect
        x={sidePanelX}
        y={sidePanelY}
        width={sidePanelWidth}
        height={sidePanelHeight}
        fill={accentColor(laneStyle.accentRgb, landscape ? 0.16 : 0.2)}
        stroke={accentColor(laneStyle.accentRgb, 0.36)}
        strokeWidth={landscape ? 0 : 1}
      />
      {landscape ? (
        <>
          <Line
            points={[sidePanelX, 0, sidePanelX, height]}
            stroke={accentColor(laneStyle.accentRgb, 0.42)}
            strokeWidth={1}
          />
          <Text
            x={sidePanelX + sidePanelWidth * 0.12}
            y={height * 0.22}
            width={sidePanelWidth * 0.76}
            text="CAMPAIGN\nREADINESS"
            fontFamily={FONT_FAMILY}
            fontSize={Math.max(18, width * 0.015)}
            lineHeight={1.25}
            fontStyle="600"
            fill="rgba(237,237,240,0.82)"
          />
        </>
      ) : null}

      <Rect
        x={landscape ? sidePanelX + sidePanelWidth * 0.12 : padX}
        y={landscape ? height * 0.73 : height - height * 0.16}
        width={landscape ? sidePanelWidth * 0.76 : sidePanelWidth}
        height={landscape ? height * 0.11 : height * 0.09}
        cornerRadius={14}
        fill={accentColor(laneStyle.accentRgb, 0.33 + accentStrength * 0.24)}
        stroke={accentColor(laneStyle.accentRgb, 0.75)}
        strokeWidth={1}
        shadowColor={accentColor(laneStyle.accentRgb, 0.38)}
        shadowBlur={24}
        shadowOffsetY={10}
      />
      <Text
        x={landscape ? sidePanelX + sidePanelWidth * 0.12 + 22 : padX + 22}
        y={landscape ? height * 0.73 + 18 : height - height * 0.16 + 16}
        width={(landscape ? sidePanelWidth * 0.76 : sidePanelWidth) - 64}
        text={(state.ctaText || "Book 20 min audit").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={ctaSize}
        letterSpacing={1.4}
        fontStyle="700"
        fill="#f4f4f5"
      />
      <Text
        x={landscape ? sidePanelX + sidePanelWidth * 0.12 + sidePanelWidth * 0.76 - 36 : padX + sidePanelWidth - 36}
        y={landscape ? height * 0.73 + 18 : height - height * 0.16 + 16}
        width={24}
        text=">"
        fontFamily={FONT_FAMILY}
        fontSize={ctaSize + 2}
        fontStyle="700"
        fill="#f4f4f5"
      />

      {state.showLogo && assets.logo ? (
        <KonvaImage
          image={assets.logo}
          x={width - width * 0.135}
          y={height - height * 0.09}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.93}
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
  assets,
}: TemplateLayerProps) {
  const landscape = format === "landscape";
  const metric = state.proofBadge.trim() || defaultMetricFromTitle(state.title);
  const panelX = width * 0.05;
  const panelY = height * 0.07;
  const panelWidth = width * 0.9;
  const panelHeight = height * 0.86;
  const metricSize = landscape ? 126 : format === "portrait" ? 142 : 132;
  const titleSize = landscape ? 44 : format === "portrait" ? 56 : 52;
  const bodySize = landscape ? 17 : format === "portrait" ? 22 : 20;
  const chipSize = landscape ? 12 : 13;
  const laneLabel = `${state.serviceLane} lane`.toUpperCase();

  const metricAreaWidth = landscape ? panelWidth * 0.36 : panelWidth;
  const copyX = landscape ? panelX + metricAreaWidth + panelWidth * 0.05 : panelX + panelWidth * 0.07;
  const copyY = landscape ? panelY + panelHeight * 0.18 : panelY + panelHeight * 0.43;
  const bars = [0.36, 0.44, 0.53, 0.6, 0.71, 0.8];
  const barW = (panelWidth * 0.42) / bars.length;

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#05060c" />
      <CoverImage image={assets.workflow} x={0} y={0} width={width} height={height} opacity={0.11} />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(11,13,22,0.94)",
          0.52,
          "rgba(6,7,13,0.97)",
          1,
          "rgba(4,5,10,1)",
        ]}
      />

      <Rect
        x={panelX}
        y={panelY}
        width={panelWidth}
        height={panelHeight}
        cornerRadius={20}
        fill="rgba(8,10,18,0.72)"
        stroke="rgba(113,113,122,0.42)"
        strokeWidth={1}
      />
      <Rect
        x={panelX}
        y={panelY}
        width={metricAreaWidth}
        height={landscape ? panelHeight : panelHeight * 0.34}
        cornerRadius={landscape ? [20, 0, 0, 20] : [20, 20, 0, 0]}
        fill={accentColor(laneStyle.accentRgb, 0.14 + accentStrength * 0.16)}
      />

      <Text
        x={panelX + panelWidth * 0.06}
        y={panelY + panelHeight * 0.08}
        width={metricAreaWidth * 0.84}
        text={(state.eyebrow || "Proof post").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={landscape ? 12 : 13}
        letterSpacing={1.6}
        fill="rgba(161,161,170,0.94)"
      />
      <Text
        x={panelX + panelWidth * 0.06}
        y={panelY + panelHeight * 0.12}
        width={metricAreaWidth * 0.84}
        text={metric}
        fontFamily={FONT_FAMILY}
        fontSize={metricSize}
        lineHeight={0.9}
        fontStyle="700"
        fill="#f4f4f5"
      />
      <Text
        x={panelX + panelWidth * 0.06}
        y={panelY + panelHeight * 0.12 + metricSize * 0.92}
        width={metricAreaWidth * 0.84}
        text="OUTCOME SPOTLIGHT"
        fontFamily={FONT_FAMILY}
        fontSize={landscape ? 12 : 13}
        letterSpacing={1.5}
        fill="rgba(161,161,170,0.9)"
      />

      <Pill
        x={panelX + panelWidth * 0.06}
        y={panelY + panelHeight * 0.12 + metricSize * 0.92 + 26}
        text="BEFORE 6H AVG"
        fontSize={chipSize}
        fill="rgba(24,24,27,0.72)"
        stroke="rgba(113,113,122,0.44)"
        textColor="#d4d4d8"
      />
      <Pill
        x={panelX + panelWidth * 0.06 + estimatePillWidth("BEFORE 6H AVG", chipSize, 18) + 10}
        y={panelY + panelHeight * 0.12 + metricSize * 0.92 + 26}
        text="AFTER 58M AVG"
        fontSize={chipSize}
        fill="rgba(24,24,27,0.72)"
        stroke="rgba(113,113,122,0.44)"
        textColor="#d4d4d8"
      />

      <Text
        x={copyX}
        y={copyY}
        width={panelX + panelWidth - copyX - panelWidth * 0.06}
        text={state.title}
        fontFamily={FONT_FAMILY}
        fontSize={titleSize}
        lineHeight={1.04}
        fontStyle="700"
        fill="#f5f5f7"
      />
      <Text
        x={copyX}
        y={copyY + titleSize * 2.08}
        width={panelX + panelWidth - copyX - panelWidth * 0.06}
        text={state.subtitle}
        fontFamily={FONT_FAMILY}
        fontSize={bodySize}
        lineHeight={1.3}
        fill="rgba(228,228,231,0.82)"
      />

      {landscape ? (
        <>
          <Rect
            x={panelX + panelWidth * 0.52}
            y={panelY + panelHeight * 0.58}
            width={panelWidth * 0.4}
            height={panelHeight * 0.26}
            cornerRadius={12}
            fill="rgba(24,24,27,0.5)"
            stroke="rgba(113,113,122,0.42)"
            strokeWidth={1}
          />
          <CoverImage
            image={assets.signal}
            x={panelX + panelWidth * 0.52 + 2}
            y={panelY + panelHeight * 0.58 + 2}
            width={panelWidth * 0.4 - 4}
            height={panelHeight * 0.26 - 4}
            radius={10}
            opacity={1}
          />
        </>
      ) : (
        <>
          <Rect
            x={panelX + panelWidth * 0.07}
            y={panelY + panelHeight * 0.66}
            width={panelWidth * 0.86}
            height={panelHeight * 0.2}
            cornerRadius={12}
            fill="rgba(24,24,27,0.52)"
            stroke="rgba(113,113,122,0.42)"
            strokeWidth={1}
          />
          <CoverImage
            image={assets.evidence}
            x={panelX + panelWidth * 0.07 + 2}
            y={panelY + panelHeight * 0.66 + 2}
            width={panelWidth * 0.86 - 4}
            height={panelHeight * 0.2 - 4}
            radius={10}
            opacity={1}
          />
        </>
      )}

      <Line
        points={[
          panelX + panelWidth * 0.07,
          panelY + panelHeight * 0.92,
          panelX + panelWidth * 0.49,
          panelY + panelHeight * 0.92,
        ]}
        stroke="rgba(113,113,122,0.58)"
        strokeWidth={1}
      />
      {bars.map((value, index) => {
        const barHeight = panelHeight * 0.13 * value;
        const x = panelX + panelWidth * 0.07 + index * (barW + 8);
        const y = panelY + panelHeight * 0.92 - barHeight;
        const highlight = index >= bars.length - 2;
        return (
          <Rect
            key={`proof-bar-${index}`}
            x={x}
            y={y}
            width={barW}
            height={barHeight}
            cornerRadius={4}
            fill={accentColor(laneStyle.accentRgb, highlight ? 0.83 : 0.46)}
          />
        );
      })}

      <Pill
        x={panelX + panelWidth * 0.58}
        y={panelY + panelHeight * 0.87}
        text={(state.ctaText || "View methodology").toUpperCase()}
        fontSize={chipSize}
        fill={accentColor(laneStyle.accentRgb, 0.3 + accentStrength * 0.2)}
        stroke={accentColor(laneStyle.accentRgb, 0.68)}
        textColor="#f5f5f7"
        width={panelWidth * 0.34}
      />
      <Text
        x={panelX + panelWidth * 0.06}
        y={panelY + panelHeight * 0.03}
        width={panelWidth * 0.88}
        text={laneLabel}
        align="right"
        fontFamily={FONT_FAMILY}
        fontSize={chipSize}
        letterSpacing={1.2}
        fill="rgba(161,161,170,0.86)"
      />

      {state.showLogo && assets.logo ? (
        <KonvaImage
          image={assets.logo}
          x={width - width * 0.135}
          y={height - height * 0.1}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.93}
        />
      ) : null}
    </>
  );
}

function EditorialFrameLayer({
  state,
  format,
  width,
  height,
  laneStyle,
  accentStrength,
  assets,
}: TemplateLayerProps) {
  const landscape = format === "landscape";
  const padX = width * 0.06;
  const padY = height * 0.08;
  const headlineSize =
    format === "portrait" ? 58 : format === "square" ? 50 : 44;
  const bodySize =
    format === "portrait" ? 22 : format === "square" ? 20 : 17;
  const chipSize = format === "portrait" ? 14 : 12;
  const proof = (state.proofBadge.trim() || "Internal product case").toUpperCase();

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#06070d" />
      <CoverImage image={assets.signal} x={0} y={0} width={width} height={height} opacity={0.13} />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillLinearGradientStartPoint={{ x: 0, y: 0 }}
        fillLinearGradientEndPoint={{ x: width, y: height }}
        fillLinearGradientColorStops={[
          0,
          "rgba(10,11,18,0.95)",
          0.6,
          "rgba(6,7,12,0.97)",
          1,
          "rgba(5,6,10,1)",
        ]}
      />
      <Circle
        x={width * 0.86}
        y={height * 0.2}
        radius={Math.max(160, width * 0.2)}
        fill={accentColor(laneStyle.accentRgb, 0.18 + accentStrength * 0.15)}
      />

      {landscape ? (
        <>
          <Line
            points={[width * 0.57, padY, width * 0.57, height - padY]}
            stroke="rgba(113,113,122,0.54)"
            strokeWidth={1}
          />
          <Text
            x={padX}
            y={padY}
            width={width * 0.45}
            text={(state.eyebrow || "Case snippet").toUpperCase()}
            fontFamily={FONT_FAMILY}
            fontSize={12}
            letterSpacing={1.7}
            fill="rgba(161,161,170,0.92)"
          />
          <Text
            x={padX}
            y={padY + 30}
            width={width * 0.45}
            text={state.title}
            fontFamily={FONT_FAMILY}
            fontSize={headlineSize}
            lineHeight={1.04}
            fontStyle="700"
            fill="#f4f4f5"
          />
          <Text
            x={padX}
            y={padY + 30 + headlineSize * 2.18}
            width={width * 0.42}
            text={state.subtitle}
            fontFamily={FONT_FAMILY}
            fontSize={bodySize}
            lineHeight={1.33}
            fill="rgba(228,228,231,0.83)"
          />

          <Rect
            x={width * 0.61}
            y={padY + 18}
            width={width * 0.32}
            height={height * 0.48}
            cornerRadius={14}
            fill="rgba(24,24,27,0.5)"
            stroke="rgba(113,113,122,0.42)"
            strokeWidth={1}
          />
          <CoverImage
            image={assets.signal}
            x={width * 0.61 + 2}
            y={padY + 20}
            width={width * 0.32 - 4}
            height={height * 0.48 - 4}
            radius={12}
            opacity={1}
          />
          <Rect
            x={width * 0.69}
            y={height * 0.55}
            width={width * 0.24}
            height={height * 0.26}
            cornerRadius={12}
            fill="rgba(12,13,21,0.88)"
            stroke={accentColor(laneStyle.accentRgb, 0.44)}
            strokeWidth={1}
          />
          <CoverImage
            image={assets.evidence}
            x={width * 0.69 + 2}
            y={height * 0.55 + 2}
            width={width * 0.24 - 4}
            height={height * 0.26 - 4}
            radius={10}
            opacity={1}
          />
        </>
      ) : (
        <>
          <Text
            x={padX}
            y={padY}
            width={width * 0.86}
            text={(state.eyebrow || "Case snippet").toUpperCase()}
            fontFamily={FONT_FAMILY}
            fontSize={13}
            letterSpacing={1.7}
            fill="rgba(161,161,170,0.92)"
          />
          <Rect
            x={padX}
            y={padY + 28}
            width={width * 0.86}
            height={height * 0.36}
            cornerRadius={14}
            fill="rgba(24,24,27,0.52)"
            stroke="rgba(113,113,122,0.42)"
            strokeWidth={1}
          />
          <CoverImage
            image={assets.signal}
            x={padX + 2}
            y={padY + 30}
            width={width * 0.86 - 4}
            height={height * 0.36 - 4}
            radius={12}
            opacity={1}
          />
          <Rect
            x={padX + width * 0.5}
            y={padY + height * 0.28}
            width={width * 0.36}
            height={height * 0.14}
            cornerRadius={10}
            fill="rgba(12,13,21,0.88)"
            stroke={accentColor(laneStyle.accentRgb, 0.44)}
            strokeWidth={1}
          />
          <CoverImage
            image={assets.evidence}
            x={padX + width * 0.5 + 2}
            y={padY + height * 0.28 + 2}
            width={width * 0.36 - 4}
            height={height * 0.14 - 4}
            radius={8}
            opacity={1}
          />

          <Text
            x={padX}
            y={padY + height * 0.43}
            width={width * 0.86}
            text={state.title}
            fontFamily={FONT_FAMILY}
            fontSize={headlineSize}
            lineHeight={1.06}
            fontStyle="700"
            fill="#f4f4f5"
          />
          <Text
            x={padX}
            y={padY + height * 0.43 + headlineSize * 2.1}
            width={width * 0.84}
            text={state.subtitle}
            fontFamily={FONT_FAMILY}
            fontSize={bodySize}
            lineHeight={1.32}
            fill="rgba(228,228,231,0.83)"
          />
        </>
      )}

      <Pill
        x={padX}
        y={height - padY - 40}
        text={proof}
        fontSize={chipSize}
        fill="rgba(24,24,27,0.72)"
        stroke="rgba(113,113,122,0.44)"
        textColor="#d4d4d8"
      />
      <Pill
        x={width - padX - width * 0.29}
        y={height - padY - 40}
        text={(state.ctaText || "Open case").toUpperCase()}
        fontSize={chipSize}
        fill={accentColor(laneStyle.accentRgb, 0.28 + accentStrength * 0.2)}
        stroke={accentColor(laneStyle.accentRgb, 0.66)}
        textColor="#f4f4f5"
        width={width * 0.29}
      />

      {state.showLogo && assets.logo ? (
        <KonvaImage
          image={assets.logo}
          x={width - width * 0.135}
          y={height - height * 0.1}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.93}
        />
      ) : null}
    </>
  );
}

function GradientStatementLayer({
  state,
  format,
  width,
  height,
  laneStyle,
  accentStrength,
  assets,
}: TemplateLayerProps) {
  const story = format === "story";
  const portrait = format === "portrait";
  const headlineSize =
    story ? 96 : portrait ? 68 : format === "square" ? 64 : 54;
  const bodySize = story ? 29 : portrait ? 22 : format === "square" ? 20 : 17;
  const metaSize = story ? 14 : 12;
  const padX = width * (story ? 0.08 : 0.09);
  const padY = height * (story ? 0.08 : 0.1);
  const ghost = (state.eyebrow || "Inovense").split(" ")[0].toUpperCase();

  return (
    <>
      <Rect x={0} y={0} width={width} height={height} fill="#06070d" />
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fillRadialGradientStartPoint={{ x: width * 0.78, y: height * 0.08 }}
        fillRadialGradientEndPoint={{ x: width * 0.78, y: height * 0.08 }}
        fillRadialGradientStartRadius={20}
        fillRadialGradientEndRadius={Math.max(width, height) * 0.8}
        fillRadialGradientColorStops={[
          0,
          accentColor(laneStyle.accentRgb, 0.38 + accentStrength * 0.22),
          0.58,
          "rgba(86,74,138,0.3)",
          1,
          "rgba(6,7,12,1)",
        ]}
      />
      <Circle
        x={width * 0.12}
        y={height * 0.88}
        radius={Math.max(220, width * 0.35)}
        fill="rgba(108,102,170,0.26)"
      />
      <Circle
        x={width * 0.9}
        y={height * 0.88}
        radius={Math.max(140, width * 0.2)}
        fill={accentColor(laneStyle.accentRgb, 0.24)}
      />
      <Text
        x={-width * 0.01}
        y={height * (story ? 0.17 : 0.12)}
        width={width * 1.1}
        text={ghost}
        fontFamily={FONT_FAMILY}
        fontSize={Math.max(120, width * 0.18)}
        letterSpacing={2.5}
        fontStyle="700"
        fill="rgba(244,244,245,0.06)"
      />

      <Text
        x={padX}
        y={padY}
        width={width * 0.84}
        text={(state.eyebrow || "Authority statement").toUpperCase()}
        fontFamily={FONT_FAMILY}
        fontSize={metaSize}
        letterSpacing={1.8}
        fill="rgba(228,228,231,0.86)"
      />
      <Text
        x={padX}
        y={padY + 36}
        width={width * (story ? 0.84 : 0.76)}
        text={state.title}
        fontFamily={FONT_FAMILY}
        fontSize={headlineSize}
        lineHeight={1.03}
        fontStyle="700"
        fill="#f4f4f5"
      />
      <Text
        x={padX}
        y={padY + 36 + headlineSize * (story ? 2.16 : 1.96)}
        width={width * (story ? 0.76 : 0.58)}
        text={state.subtitle}
        fontFamily={FONT_FAMILY}
        fontSize={bodySize}
        lineHeight={1.3}
        fill="rgba(228,228,231,0.85)"
      />

      <Pill
        x={padX}
        y={height - padY - 42}
        text={(state.ctaText || "Read the thesis").toUpperCase()}
        fontSize={metaSize}
        fill={accentColor(laneStyle.accentRgb, 0.28 + accentStrength * 0.2)}
        stroke={accentColor(laneStyle.accentRgb, 0.68)}
        textColor="#f4f4f5"
      />
      <Text
        x={width - padX - width * 0.24}
        y={height - padY - 27}
        width={width * 0.24}
        text={(state.proofBadge || "Inovense perspective").toUpperCase()}
        align="right"
        fontFamily={FONT_FAMILY}
        fontSize={metaSize}
        letterSpacing={1.4}
        fill="rgba(212,212,216,0.88)"
      />

      {state.showLogo && assets.logo ? (
        <KonvaImage
          image={assets.logo}
          x={width - width * 0.135}
          y={height - height * 0.1}
          width={width * 0.1}
          height={(width * 0.1 * 28) / 124}
          opacity={0.93}
        />
      ) : null}
    </>
  );
}

function CoverImage({ image, x, y, width, height, opacity = 1, radius = 0 }: CoverImageProps) {
  if (!image) return null;

  const crop = computeCoverCrop(image, width, height);
  if (!crop) return null;

  if (radius <= 0) {
    return (
      <KonvaImage
        image={image}
        x={x}
        y={y}
        width={width}
        height={height}
        crop={crop}
        opacity={opacity}
      />
    );
  }

  return (
    <Group
      x={x}
      y={y}
      clipFunc={(context) => {
        drawRoundedRectPath(context, 0, 0, width, height, radius);
      }}
    >
      <KonvaImage
        image={image}
        x={0}
        y={0}
        width={width}
        height={height}
        crop={crop}
        opacity={opacity}
      />
    </Group>
  );
}

function Pill({
  x,
  y,
  text,
  fontSize,
  fill,
  stroke,
  textColor,
  width,
  paddingX = 18,
  paddingY = 8,
}: PillProps) {
  const resolvedWidth = width ?? estimatePillWidth(text, fontSize, paddingX);
  const resolvedHeight = fontSize + paddingY * 2;

  return (
    <Group x={x} y={y}>
      <Rect
        width={resolvedWidth}
        height={resolvedHeight}
        cornerRadius={resolvedHeight / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
      <Text
        x={0}
        y={0}
        width={resolvedWidth}
        height={resolvedHeight}
        align="center"
        verticalAlign="middle"
        text={text}
        fontFamily={FONT_FAMILY}
        fontSize={fontSize}
        letterSpacing={1.2}
        fontStyle="700"
        fill={textColor}
      />
    </Group>
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
      const nextWidth = node.clientWidth;
      setContainerWidth(nextWidth > 0 ? nextWidth : 0);
    };

    updateWidth();

    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return { containerRef, containerWidth };
}

function drawRoundedRectPath(
  context: {
    beginPath: () => void;
    moveTo: (x: number, y: number) => void;
    lineTo: (x: number, y: number) => void;
    quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => void;
    closePath: () => void;
  },
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const clamped = Math.max(0, Math.min(radius, Math.min(width, height) / 2));
  context.beginPath();
  context.moveTo(x + clamped, y);
  context.lineTo(x + width - clamped, y);
  context.quadraticCurveTo(x + width, y, x + width, y + clamped);
  context.lineTo(x + width, y + height - clamped);
  context.quadraticCurveTo(x + width, y + height, x + width - clamped, y + height);
  context.lineTo(x + clamped, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - clamped);
  context.lineTo(x, y + clamped);
  context.quadraticCurveTo(x, y, x + clamped, y);
  context.closePath();
}

function estimatePillWidth(text: string, fontSize: number, horizontalPadding: number) {
  return text.length * fontSize * 0.56 + horizontalPadding * 2;
}

function defaultMetricFromTitle(title: string) {
  const match = title.match(/[+-]?\d+%/);
  return match?.[0] ?? "+38%";
}

function accentColor(accentRgb: string, alpha: number) {
  const [r, g, b] = accentRgb.split(" ").map((value) => Number(value));
  const clamped = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${clamped})`;
}

function computeCoverCrop(image: HTMLImageElement | null, targetWidth: number, targetHeight: number) {
  if (!image || targetWidth <= 0 || targetHeight <= 0) return null;

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
