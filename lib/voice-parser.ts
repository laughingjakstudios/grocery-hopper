/**
 * Voice Command Parser
 *
 * Handles complex natural language grocery commands:
 * - "add milk" → Add single item
 * - "add milk and eggs" → Add multiple items
 * - "add 3 apples" → Add item with quantity
 * - "add two pounds of chicken" → Complex quantity
 * - "check off bread" → Mark item complete
 * - "remove cheese" → Delete item
 * - "add milk to costco list" → Target specific list
 */

export interface ParsedCommand {
  action: 'add' | 'complete' | 'uncomplete' | 'remove'
  items: ParsedItem[]
  targetList?: string // List name if specified
  raw: string // Original transcript
}

export interface ParsedItem {
  name: string
  quantity?: number
  unit?: string
  originalText: string
}

// Action verb mappings
const ACTION_VERBS = {
  add: ['add', 'adding', 'buy', 'get', 'need', 'pick up', 'grab'],
  complete: ['check off', 'mark', 'complete', 'done with', 'got', 'bought'],
  uncomplete: ['uncheck', 'unmark', 'undo'],
  remove: ['remove', 'delete', 'clear', 'take off'],
}

// Common quantity patterns
const QUANTITY_PATTERNS = [
  // Numbers: "3 apples", "12 eggs"
  /^(\d+)\s+(.+)$/,

  // Text numbers: "two apples", "three bags of chips"
  /^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\s+(.+)$/i,

  // Fractions: "half a pound", "quarter cup"
  /^(half|quarter)\s+(.+)$/i,

  // Units: "2 pounds of", "3 cans of"
  /^(\d+)\s+(pound|pounds|lb|lbs|ounce|ounces|oz|can|cans|box|boxes|bag|bags|bottle|bottles|gallon|gallons|quart|quarts|cup|cups|dozen)\s+(?:of\s+)?(.+)$/i,

  // Text units: "two pounds of", "three cans of"
  /^(one|two|three|four|five|six|seven|eight|nine|ten)\s+(pound|pounds|lb|lbs|ounce|ounces|oz|can|cans|box|boxes|bag|bags|bottle|bottles|gallon|gallons|quart|quarts|cup|cups|dozen)\s+(?:of\s+)?(.+)$/i,
]

// Text number to digit conversion
const TEXT_TO_NUMBER: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12,
  half: 0.5, quarter: 0.25,
}

/**
 * Main parsing function
 */
export function parseVoiceCommand(transcript: string): ParsedCommand {
  const normalized = transcript.toLowerCase().trim()

  // Detect action verb
  const action = detectAction(normalized)

  // Extract target list if specified
  const { text: withoutList, targetList } = extractTargetList(normalized)

  // Remove action verb from text
  const withoutAction = removeActionVerb(withoutList, action)

  // Split by "and" or commas to handle multiple items
  const itemTexts = splitItems(withoutAction)

  // Parse each item for quantity/unit
  const items = itemTexts.map(parseItem)

  return {
    action,
    items,
    targetList,
    raw: transcript,
  }
}

/**
 * Detect the action verb (add, complete, remove, etc.)
 */
function detectAction(text: string): ParsedCommand['action'] {
  for (const [action, verbs] of Object.entries(ACTION_VERBS)) {
    for (const verb of verbs) {
      if (text.startsWith(verb) || text.includes(` ${verb} `)) {
        return action as ParsedCommand['action']
      }
    }
  }

  // Default to "add" if no action detected
  return 'add'
}

/**
 * Extract target list name if specified
 * Examples:
 * - "add milk to costco list"
 * - "add eggs to my shopping list"
 * - "add bread to my grocery list"
 * - "add butter to the weekend list"
 */
function extractTargetList(text: string): { text: string; targetList?: string } {
  const patterns = [
    // "to my shopping list" or "to my grocery list" - use generic keyword
    /\s+to\s+my\s+(shopping|grocery)\s+list$/i,
    // "to the shopping list"
    /\s+to\s+the\s+(shopping|grocery)\s+list$/i,
    // "to my [name] list" (e.g., "to my costco list")
    /\s+to\s+my\s+(.+?)\s+list$/i,
    // "to [name] list" (e.g., "to weekend list")
    /\s+to\s+(?:the\s+)?(.+?)\s+list$/i,
    // "on my [name] list"
    /\s+on\s+(?:my|the)\s+(.+?)\s+list$/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const listName = match[1].trim().toLowerCase()

      // Map generic terms to null (means "use default list")
      if (listName === 'shopping' || listName === 'grocery') {
        return {
          text: text.replace(pattern, '').trim(),
          targetList: undefined, // Use default list
        }
      }

      return {
        text: text.replace(pattern, '').trim(),
        targetList: listName,
      }
    }
  }

  return { text }
}

/**
 * Remove action verb from beginning of text
 */
function removeActionVerb(text: string, action: ParsedCommand['action']): string {
  const verbs = ACTION_VERBS[action]

  for (const verb of verbs) {
    if (text.startsWith(verb)) {
      return text.slice(verb.length).trim()
    }
  }

  return text
}

/**
 * Split text into individual items
 * Handles: "milk and eggs", "milk, eggs, and bread", "milk and eggs and cheese"
 */
function splitItems(text: string): string[] {
  // Replace " and " with comma for consistent splitting
  const withCommas = text.replace(/\s+and\s+/gi, ', ')

  // Split by comma
  const parts = withCommas.split(',').map(s => s.trim()).filter(Boolean)

  // If no commas found, return as single item
  return parts.length > 0 ? parts : [text]
}

/**
 * Parse individual item for quantity and unit
 */
function parseItem(text: string): ParsedItem {
  const cleaned = text.trim()

  // Try each quantity pattern
  for (const pattern of QUANTITY_PATTERNS) {
    const match = cleaned.match(pattern)
    if (match) {
      const [, quantityText, possibleUnit, possibleName] = match

      // Convert text number to digit
      const quantity = TEXT_TO_NUMBER[quantityText.toLowerCase()] || parseInt(quantityText)

      // Check if we captured a unit
      if (possibleName) {
        // Pattern had unit: "2 pounds of chicken"
        return {
          name: capitalize(possibleName.trim()),
          quantity,
          unit: possibleUnit,
          originalText: text,
        }
      } else {
        // Pattern had no unit: "3 apples"
        return {
          name: capitalize(possibleUnit.trim()),
          quantity,
          originalText: text,
        }
      }
    }
  }

  // No quantity found - just a plain item
  return {
    name: capitalize(cleaned),
    originalText: text,
  }
}

/**
 * Capitalize first letter of each word
 */
function capitalize(text: string): string {
  return text
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Format parsed command for display
 */
export function formatCommandSummary(command: ParsedCommand): string {
  const action = command.action === 'complete' ? 'Checked off' :
                 command.action === 'uncomplete' ? 'Unchecked' :
                 command.action === 'remove' ? 'Removed' :
                 'Added'

  const itemsList = command.items.map(item => {
    if (item.quantity && item.unit) {
      return `${item.quantity} ${item.unit} of ${item.name}`
    } else if (item.quantity) {
      return `${item.quantity} ${item.name}`
    } else {
      return item.name
    }
  }).join(', ')

  return `${action} ${itemsList}`
}
