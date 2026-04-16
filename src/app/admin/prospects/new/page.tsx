import type { Metadata } from "next";
import NewProspectForm from "./new-prospect-form";

export const metadata: Metadata = {
  title: "New prospect | Inovense CRM",
};

type SearchParams = Record<string, string | string[] | undefined>;

function getTextParam(searchParams: SearchParams, key: string): string {
  const value = searchParams[key];
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value) && typeof value[0] === "string") return value[0].trim();
  return "";
}

export default async function NewProspectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const generationSeed = {
    market: getTextParam(params, "market"),
    niche: getTextParam(params, "niche"),
    location: getTextParam(params, "location"),
    volume: getTextParam(params, "volume"),
    source: getTextParam(params, "source"),
  };

  return <NewProspectForm generationSeed={generationSeed} />;
}
