#!/usr/bin/env python3
"""
Diagnostic script to check conversation status after matching
"""
import asyncio
import sys
sys.path.insert(0, 'api')

from sqlalchemy import select, desc
from app.db.base import AsyncSessionLocal
from app.models.lead import Lead
from app.models.conversation import Conversation, Message
from app.models.requirement import Requirement


async def check_conversations():
    async with AsyncSessionLocal() as db:
        # Get recent leads
        result = await db.execute(
            select(Lead)
            .order_by(desc(Lead.created_at))
            .limit(10)
        )
        leads = result.scalars().all()

        print(f"\n{'='*80}")
        print(f"RECENT LEADS (Last 10)")
        print(f"{'='*80}\n")

        for lead in leads:
            print(f"Lead #{lead.id}:")
            print(f"  Status: {lead.status}")
            print(f"  Buyer ID: {lead.buyer_id}, Supplier ID: {lead.supplier_id}")
            print(f"  Requirement ID: {lead.requirement_id}")
            print(f"  Fit Score: {lead.fit_score}")
            print(f"  Negotiation Round: {lead.negotiation_round}")
            print(f"  Created: {lead.created_at}")

            # Check if conversation exists
            conv_result = await db.execute(
                select(Conversation).where(Conversation.lead_id == lead.id)
            )
            conversation = conv_result.scalar_one_or_none()

            if conversation:
                print(f"  ✅ Conversation exists: ID #{conversation.id}, Mode: {conversation.mode}")

                # Count messages
                msg_result = await db.execute(
                    select(Message).where(Message.conversation_id == conversation.id)
                )
                messages = msg_result.scalars().all()
                print(f"  💬 Messages: {len(messages)}")

                for i, msg in enumerate(messages[:5], 1):  # Show first 5 messages
                    print(f"     {i}. [{msg.role}] {msg.content[:80]}...")

                if len(messages) > 5:
                    print(f"     ... and {len(messages) - 5} more messages")

                # Check AI context
                ai_context_count = len(conversation.ai_context) if conversation.ai_context else 0
                print(f"  🤖 AI Context entries: {ai_context_count}")

            else:
                print(f"  ❌ NO CONVERSATION FOUND")

            print()

        # Summary
        print(f"\n{'='*80}")
        print(f"SUMMARY")
        print(f"{'='*80}\n")

        total_leads = len(leads)
        leads_with_conv = sum(1 for lead in leads if lead.status != 'new')

        conv_result = await db.execute(select(Conversation))
        total_conversations = len(conv_result.scalars().all())

        msg_result = await db.execute(select(Message))
        total_messages = len(msg_result.scalars().all())

        print(f"Total Leads (last 10): {total_leads}")
        print(f"Leads with conversation attempts: {leads_with_conv}")
        print(f"Total Conversations in DB: {total_conversations}")
        print(f"Total Messages in DB: {total_messages}")
        print()


if __name__ == "__main__":
    asyncio.run(check_conversations())
