import React, { useRef, useState } from 'react'
import { AlertCircle, File, Upload, X } from 'lucide-react'

export default function UploadZone({ onUpload, onFileSelect, loading, disabled = false }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = (selectedFile) => {
    if (!selectedFile) return
    const extension = selectedFile.name.split('.').pop()?.toLowerCase()
    if (!['stl', 'obj'].includes(extension)) {
      setError(`Unsupported format (.${extension}). Use .stl or .obj.`)
      return
    }
    if (selectedFile.size > 100 * 1024 * 1024) {
      setError('File too large (maximum 100 MB).')
      return
    }
    setError('')
    setFile(selectedFile)
    onFileSelect?.(selectedFile)
  }

  const clearFile = () => {
    setFile(null)
    onFileSelect?.(null)
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="studio-upload">
      <div
        className={`studio-drop-zone${dragging ? ' is-dragging' : ''}${file ? ' has-file' : ''}`}
        onDragOver={(event) => { event.preventDefault(); if (!disabled) setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (disabled) return
          handleFile(event.dataTransfer.files[0])
        }}
        onClick={() => !file && !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!file && (event.key === 'Enter' || event.key === ' ')) inputRef.current?.click()
        }}
        role={!file ? 'button' : undefined}
        tabIndex={!file ? 0 : undefined}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".stl,.obj"
          hidden
          disabled={disabled}
          onChange={(event) => handleFile(event.target.files[0])}
          id="mesh-file-input"
        />
        <div className="studio-upload-icon">{file ? <File size={23}/> : <Upload size={23}/>}</div>
        {file ? (
          <>
            <strong className="studio-upload-filename">{file.name}</strong>
            <span className="studio-upload-size">{(file.size / (1024 * 1024)).toFixed(2)} MB · STL / OBJ</span>
            <div className="studio-upload-actions">
              <button className="studio-button studio-button-secondary" onClick={(event) => { event.stopPropagation(); clearFile() }} disabled={disabled}>
                <X size={14}/> Remove
              </button>
              <button
                className="studio-button studio-button-primary"
                onClick={(event) => { event.stopPropagation(); onUpload?.(file) }}
                disabled={loading || disabled}
                id="upload-btn"
              >
                <Upload size={14}/>{loading ? 'Uploading…' : 'Upload mesh'}
              </button>
            </div>
          </>
        ) : (
          <>
            <strong>Drop a mesh file here</strong>
            <span>or click to browse</span>
            <div className="studio-file-types"><i>.STL</i><i>.OBJ</i></div>
            <small>Maximum file size: 100 MB</small>
          </>
        )}
      </div>
      {error && <div className="studio-inline-error" role="alert"><AlertCircle size={14}/>{error}</div>}
    </div>
  )
}
