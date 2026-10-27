import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { HttpError } from '../middleware/index.js'
import { Upload } from '../models/index.js'

export const UPLOAD_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'uploads')
export const MAX_IMAGE = 5 * 1024 * 1024

// Raw image body (Content-Type: image/png|jpeg|webp). The type is verified again from the file bytes.
export const imageBody = express.raw({ type: ['image/png', 'image/jpeg', 'image/webp'], limit: MAX_IMAGE })

// Identify the image from its first bytes; the client-declared type is not trusted.
function sniff(b) {
  if (b.length > 12 && b[0] === 0x89 && b.toString('latin1', 1, 4) === 'PNG') return { ext: 'png', mime: 'image/png' }
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' }
  if (b.length > 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' }
  return null
}

export async function saveImage(buffer, owner, purpose) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) throw new HttpError(400, 'Attach a PNG, JPG or WebP image (max 5 MB)')
  const type = sniff(buffer)
  if (!type) throw new HttpError(400, 'That file is not a PNG, JPG or WebP image')
  const file = `${crypto.randomUUID()}.${type.ext}`
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.writeFile(path.join(UPLOAD_DIR, file), buffer)
  return Upload.create({ owner, purpose, file, mime: type.mime, size: buffer.length })
}

// An upload id the player sent must be theirs and made for this purpose.
export async function ownedUpload(id, owner, purpose) {
  const up = id && /^[a-f0-9]{24}$/i.test(String(id)) ? await Upload.findOne({ _id: id, owner, purpose }) : null
  if (!up) throw new HttpError(400, 'Upload a screenshot first')
  return up
}

export const sendUpload = (res, up) => {
  res.setHeader('Content-Type', up.mime)
  res.setHeader('Cache-Control', 'private, max-age=3600')
  res.sendFile(path.join(UPLOAD_DIR, up.file), (err) => err && !res.headersSent && res.status(404).json({ error: 'File missing' }))
}

export const removeUpload = async (up) => {
  if (!up) return
  await fs.rm(path.join(UPLOAD_DIR, up.file), { force: true })
  await Upload.deleteOne({ _id: up._id })
}
