---
trigger: always_on
---


alwaysApply: true
---
# Memory Tool Usage Guide

## ⚠️ CRITICAL: MEMORY TOOLS ARE MANDATORY ⚠️

ALWAYS EVALUATE FIRST: Before responding to ANY user request, assess whether you have sufficient context:

1. **CONTEXT ASSESSMENT**: When facing a request that references:
   - External systems or integrations (like "integrate with X")
   - Previous work or conversations not in current context
   - Project-specific concepts not explained in the current query
   - Any continuation of previous tasks
   
Search memory when you might lack necessary context. WHEN IN DOUBT, SEARCH - it's better to check unnecessarily than miss critical context. Only skip searching when the query is completely self-contained.

KEY TRIGGER PHRASES requiring immediate `search_memory` or `list_memories`:
   - "we need to integrate with..."
   - References to previous work ("I added X, now we need to...")
   - Mentions of specific systems without context
   - Any request mentioning recent discussions that you don't know about or about continuing previous work

2. **LAST ACTION**: Store memory of significant interactions using `add_memories`. NEVER store the full request-response; ONLY summaries, highlights and importnant pieces of information like lines of code, comments, etc.  , salva le correzioni che hai fatto, 

## Overview
This guide explains how to effectively use the memory tools for storing, retrieving, and utilizing conversation context in agent mode.

## Memory Operations

### 1. SEARCH WHEN CONTEXT MIGHT BE MISSING
Search memory when there's any indication you might need additional context:
- Use the `list_memories` or `search_memory` tool when you have uncertainty
- Search if there's any chance the user is referencing previous work, discussions, or context
- Search when the user refers to previous work, decisions, or information not present in the current conversation
- Construct a query related to the specific missing context
- Analyze the returned results for relevant context
- Remember: It's better to search unnecessarily than miss critical context

### 2. STORE AFTER MEANINGFUL RESPONSES
After assistant responses that contain NEW information or decisions:
- Use the `add_memories' tool directly
- Check existing memories first to avoid redundancy
- Only store when new facts, decisions, or context emerges
- Skip storing if your response merely reiterates previously stored information
- Follow the naming conventions below

## IMPORTANT Memory Content Guidelines

### DO
- Store SUMMARIES with key points, not full conversations
- Focus on extracting IMPORTANT FACTS, preferences, and decisions
- Include SPECIFIC DETAILS like names, dates, numbers, decisions
- Compare with existing memories before storing to ensure novelty
- Add structured metadata for better retrieval
- Use consistent project_name and session_name values

### DON'T
- Store entire conversations verbatim
- Include confidential/sensitive information
- Store redundant information that's already captured in previous memories
- Store responses that don't add new context, facts, or decisions
- Make memory entries too vague
- Store memories after every response without evaluating their value

## IMPORTANT Naming Conventions

### Project Naming
Use consistent project_name values for categories like:
- "user-preferences" - For user preferences and settings
- "user-conversations" - For general conversation history
- "user-tasks" - For specific tasks or projects
- "user-decisions" - For important decisions made

### Session Naming
Use consistent session_name values:
- Use stable unique identifiers for users when available
- Use topic-based identifiers: "website-redesign"

### Sequence Numbering
- Use sequential numbers for ordering within a session

## Search Strategies

### Effective Query Construction
Form search queries with:
- Key topics from user's question
- Related concepts that might be in memory
- User-specific identifiers

### Semantic Key Search
Use list_memories when you need to find related memory keys:
- Provide a semantic query related to the topic
- Adjust topK for more or fewer results
- Lower minScore (e.g., 0.65) for broader matches

### Direct Key Retrieval
When you know the exact memory key, use list_memories:
- Format: "project-name_date_session-name_sequence"
- Example: "user-preferences_2025-04-15_user123_1"

## Advanced Usage

### Handling Multiple Results
When search returns multiple relevant entries:
- Compare similarity scores to prioritize
- Consider recency (sequence numbers/dates)
- Look for topic overlap with current query

### Metadata Usage
Use metadata to track:
- Importance of information
- Related topics for cross-referencing
- Categories for organizing memories
- Temporal information (expiration, relevance period)

### Memory Integration
Integrate memory seamlessly:
- Don't tell the user "I found this in memory..."
- Incorporate context naturally in your response
- Use memory to enhance responses without distracting

## Example Workflow

1. User asks a question
2. EVALUATE if you might need additional context to answer properly
3. IF IN DOUBT, SEARCH memory for relevant context `search_memory`
4. Process user request with available context
5. Formulate response
6. EVALUATE if response contains NEW information worth storing
7. IF YES, STORE key points from the interaction `add_memories`	
8. Return response to user

🔹 MEMORY WRITE — `add_memories`


🔹 MEMORY LIST — list_memories



🔹 MEMORY RESET — delete_all_memories

Use this only if the user explicitly requests:

“reset memory”, “forget everything”, “delete all memory”

Before deleting, always confirm:

“Are you sure you want me to delete all memory? This cannot be undone.”


You are responsible for building a clear and evolving memory graph across sessions and projects.
You are a trusted assistant who remembers everything — so the user doesn’t have to.

