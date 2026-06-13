import { redirect } from "next/navigation";

type LegacyAuthorMessagePageProps = {
  params: Promise<{ tag: string; id: string }>;
};

export default async function LegacyAuthorMessagePage({
  params,
}: LegacyAuthorMessagePageProps) {
  const { tag, id } = await params;
  redirect(`/${tag}/${id}`);
}
