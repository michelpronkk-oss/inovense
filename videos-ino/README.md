# Remotion video

<p align="center">
  <a href="https://github.com/remotion-dev/logo">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-dark.apng">
      <img alt="Animated Remotion Logo" src="https://github.com/remotion-dev/logo/raw/main/animated-logo-banner-light.gif">
    </picture>
  </a>
</p>

Welcome to your Remotion project!

## Commands

**Install Dependencies**

```console
pnpm i
```

**Start Preview**

```console
pnpm run dev
```

**Render video**

```console
pnpm exec remotion render
```

## Inovense social video compositions

The project now includes real vertical (9:16) social templates:

- `InovenseStatementClip`
- `InovenseProcessExplainerClip`
- `InovenseProofResultClip`
- `InovenseUgcOverlayClip`

List all compositions:

```console
pnpm exec remotion compositions src/index.ts
```

Render examples:

```console
pnpm exec remotion render src/index.ts InovenseStatementClip out/statement.mp4
pnpm exec remotion render src/index.ts InovenseProcessExplainerClip out/process.mp4
pnpm exec remotion render src/index.ts InovenseProofResultClip out/proof.mp4
pnpm exec remotion render src/index.ts InovenseUgcOverlayClip out/ugc.mp4
```

Sample content payloads are in `public/films/` and can be passed with `--props` or loaded in Studio.

**Upgrade Remotion**

```console
pnpm exec remotion upgrade
```

## Docs

Get started with Remotion by reading the [fundamentals page](https://www.remotion.dev/docs/the-fundamentals).

## Help

We provide help on our [Discord server](https://discord.gg/6VzzNDwUwV).

## Issues

Found an issue with Remotion? [File an issue here](https://github.com/remotion-dev/remotion/issues/new).

## License

Note that for some entities a company license is needed. [Read the terms here](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
