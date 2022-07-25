export function removeErrorTag (message: string, tag = 'error: '): string {
  return message.startsWith(tag) ? message.substring(tag.length) : message
}
