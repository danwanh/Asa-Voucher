import { ArticleDetailPage } from "@/components/ArticleDetailPage"

export default function NewsDetailRoute({ params }: { params: { id: string } }) {
  return <ArticleDetailPage articleId={params.id} />
}