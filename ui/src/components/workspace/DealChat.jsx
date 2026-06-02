import ConversationView from './ConversationView'

export default function DealChat({ lead, conversationId }) {
  if (!lead) return null
  return <ConversationView leadId={lead.id}/>
}
