import React, { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { Modal } from './ui/modal'
import { DialogTitle } from './ui/dialog'

function getCroppedImg(imageSrc, crop, zoom, aspect) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const naturalWidth = image.naturalWidth
      const naturalHeight = image.naturalHeight

      const scale = naturalWidth / (image.width || naturalWidth)
      const pixelCropX = crop.x * scale
      const pixelCropY = crop.y * scale

      const width = Math.min(naturalWidth, naturalHeight)
      const height = width / aspect

      canvas.width = Math.round(width)
      canvas.height = Math.round(height)

      const sx = Math.max(0, pixelCropX)
      const sy = Math.max(0, pixelCropY)
      const sWidth = Math.min(naturalWidth - sx, width)
      const sHeight = Math.min(naturalHeight - sy, height)

      ctx.drawImage(image, sx, sy, sWidth, sHeight, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Canvas toBlob failed'))
        resolve(blob)
      }, 'image/jpeg', 0.92)
    }
    image.onerror = reject
    image.src = imageSrc
  })
}

export default function AvatarCropDialog({ open, onClose, onSaved }) {
  const [imageSrc, setImageSrc] = useState(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [loading, setLoading] = useState(false)

  const onDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer?.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result)
    reader.readAsDataURL(file)
  }, [])

  const onPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImageSrc(reader.result)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!imageSrc) return
    setLoading(true)
    try {
      const blob = await getCroppedImg(imageSrc, crop, zoom, 1)
      const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' })
      if (typeof onSaved === 'function') onSaved(file)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      <div className="p-4">
        <DialogTitle>Update Profile Photo</DialogTitle>
        <p className="text-sm text-muted-foreground mb-3">Drag and drop a photo here, or click to choose a file. Crop to fit.</p>
        <div
          onDrop={onDrop}
          onDragOver={(e)=>e.preventDefault()}
          className="relative border rounded-md bg-muted/40 aspect-square overflow-hidden flex items-center justify-center cursor-pointer"
        >
          {imageSrc ? (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              onCropChange={setCrop}
              onZoomChange={setZoom}
            />
          ) : (
            <div className="text-sm text-muted-foreground">
              Drop image here or <label className="text-primary underline cursor-pointer"><input className="hidden" type="file" accept="image/*" onChange={onPick} />browse</label>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 mt-4">
          <input type="range" min="1" max="3" step="0.1" value={zoom} onChange={e=>setZoom(parseFloat(e.target.value))} />
          <div className="ml-auto flex gap-2">
            <button onClick={onClose} className="px-3 py-1.5 rounded-md border bg-background">Cancel</button>
            <button onClick={handleSave} disabled={!imageSrc || loading} className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground disabled:opacity-50">{loading ? 'Saving…' : 'Save'}</button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
