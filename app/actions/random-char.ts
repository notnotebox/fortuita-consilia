"use server"

function randomChar(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz "
  const index = Math.floor(Math.random() * chars.length)
  return chars[index] ?? " "
}

export async function appendRandomChar(current: string): Promise<string> {
  return `${current}${randomChar()}`
}

export async function deleteLastChar(current: string): Promise<string> {
  return current.slice(0, -1)
}
