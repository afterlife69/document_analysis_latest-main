import React, { useState, useRef, useEffect } from "react"
import {
  Upload,
  FileText,
  FileCheck2,
  Trash2,
  Loader2,
  X,
  ChevronRight,
  FilePlus,
  FileImage,
  FileDigit,
  AlertCircle,
  Calendar,
  MessageSquare,
  Eye,
  Home,
  ChevronLeft,
  Download
} from "lucide-react"
import axios from "axios"
import { Link } from "react-router-dom"
import { toast } from 'react-hot-toast' // You'll need to install this package

// Allowed file types
const ALLOWED_FILE_TYPES = [
  "application/pdf", // pdf
  "application/msword", // doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "image/png", // png
  "image/jpeg" // jpeg/jpg
]

// Simplified types for UI display
const FILE_TYPE_ICONS = {
  "application/pdf": <FileText className="w-8 h-8 text-red-400" />,
  "application/msword": <FileText className="w-8 h-8 text-blue-400" />,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": <FileText className="w-8 h-8 text-blue-400" />,
  "image/png": <FileImage className="w-8 h-8 text-green-400" />,
  "image/jpeg": <FileImage className="w-8 h-8 text-green-400" />
}

// File categories
const FILE_CATEGORIES = ["Document", "Timetable"]

function DocManage() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploadType, setUploadType] = useState("")
  const [fileCategory, setFileCategory] = useState("Document") // New state for dropdown
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [documentUrl, setDocumentUrl] = useState(null)
  const [error, setError] = useState("")
  const [uploadStatus, setUploadStatus] = useState("") // For tracking upload status
  const [viewLoading, setViewLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Fetch documents on component mount
  useEffect(() => {
    fetchUserDocuments()
  }, [])

  const fetchUserDocuments = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await axios.get('http://localhost:8080/api/personal/documents', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.data.success) {
        setDocuments(response.data.documents)
      } else {
        setError('Failed to load documents: ' + (response.data.message || 'Unknown error'))
        toast.error('Failed to load documents')
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Could not connect to server'
      setError(`Error fetching documents: ${errorMessage}`)
      toast.error(errorMessage)
      setDocuments([]) // Reset documents on error
    } finally {
      setLoading(false)
    }
  }

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files || [])
    setError("")

    if (selectedFiles.length + files.length > 4) {
      setError("You can upload a maximum of 4 files")
      return
    }

    // Filter for valid file types
    const validFiles = files.filter(file => {
      const isValidType = ALLOWED_FILE_TYPES.includes(file.type)
      if (!isValidType) {
        setError("Only PDF, DOC, DOCX, PNG, JPEG files are allowed")
      }
      return isValidType
    })

    if (validFiles.length > 0) {
      // Create preview for each file
      const filesWithPreviews = validFiles.map(file => {
        const preview = file.type.startsWith('image/') 
          ? URL.createObjectURL(file) 
          : null
        
        return {
          file,
          preview,
          id: Math.random().toString(36).substr(2, 9)
        }
      })

      setSelectedFiles(prev => [...prev, ...filesWithPreviews])
    }
    
    // Clear the input to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = null
    }
  }

  const removeSelectedFile = (idToRemove) => {
    setSelectedFiles(prev => {
      // Release object URLs to prevent memory leaks
      const fileToRemove = prev.find(item => item.id === idToRemove)
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      
      return prev.filter(item => item.id !== idToRemove)
    })
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !uploadType || isUploading) return
    
    setIsUploading(true)
    setUploadStatus("")
    
    try {
      // Create FormData to send files
      const formData = new FormData()
      
      // Add files to FormData
      selectedFiles.forEach((item) => {
        formData.append('files', item.file)
      })
      
      // Add metadata
      formData.append('documentType', uploadType)
      formData.append('fileCategory', fileCategory)
      
      // Send to backend
      const response = await axios.post('http://localhost:8080/api/personal/process', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization' : `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadStatus(`Uploading: ${percentCompleted}%`)
        }
      })
      
      // Handle successful upload
      if (response.data && response.status === 200) {
        // Refresh document list
        fetchUserDocuments()
        
        setUploadStatus("Upload completed successfully!")
        toast.success('Documents uploaded successfully')
        
        // Cleanup previews
        selectedFiles.forEach(item => {
          if (item.preview) {
            URL.revokeObjectURL(item.preview)
          }
        })
        
        setSelectedFiles([])
        setUploadType("")
      }
    } catch (error) {
      console.error("Upload error:", error)
      setError(`Upload failed: ${error.response?.data?.message || error.message || "Unknown error"}`)
      toast.error('Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleViewDocument = async (docId) => {
    setViewLoading(true)
    try {
      const response = await axios.get(`http://localhost:8080/api/personal/documents/${docId}/view`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.data.success) {
        setDocumentUrl(response.data.documentUrl)
        // Open document in new tab
        window.open(response.data.documentUrl, '_blank')
      } else {
        toast.error('Unable to view document')
      }
    } catch (error) {
      console.error('Error viewing document:', error)
      toast.error('Failed to retrieve document')
    } finally {
      setViewLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      const response = await axios.delete(`http://localhost:8080/api/personal/documents/${id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })
      
      if (response.data.success) {
        setDocuments(documents.filter(doc => doc.id !== id))
        if (selectedDoc?.id === id) {
          setSelectedDoc(null)
        }
        toast.success('Document deleted successfully')
      } else {
        toast.error('Failed to delete document')
      }
    } catch (error) {
      console.error('Error deleting document:', error)
      toast.error('Error deleting document')
    }
  }

  const formatFileSize = bytes => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const formatDate = date => {
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(date))
  }

  // Get appropriate icon for file type
  const getFileIcon = (fileType) => {
    return FILE_TYPE_ICONS[fileType] || <FileDigit className="w-8 h-8 text-gray-400" />
  }

  // Create empty slots array for UI
  const fileSlots = Array(4).fill(null).map((_, index) => {
    return selectedFiles[index] || null
  })

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <Link 
              to="/home" 
              className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
            >
              <ChevronLeft className="w-5 h-5" /> 
              <span>Back to Home</span>
            </Link>
            
            <h1 className="text-3xl font-bold">Document Vault</h1>
            
            <Link 
              to="/docbot" 
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              <span>Ask About Documents</span>
            </Link>
          </div>

          {/* Upload Section */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Upload Documents</h2>
            <p className="text-gray-400 mb-6">
              Upload and manage your personal documents securely (PDF, DOC, DOCX, PNG, JPEG)
            </p>
            <div className="mb-4">
              {/* File Category Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  File Category
                </label>
                <select
                  value={fileCategory}
                  onChange={e => setFileCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {FILE_CATEGORIES.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Document Name/Type */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Document Name
                </label>
                <input
                  type="text"
                  placeholder="Document Type (e.g., Passport, Certificate)"
                  className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={uploadType}
                  onChange={e => setUploadType(e.target.value)}
                />
              </div>

              {/* File Selection Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                {fileSlots.map((fileItem, index) => (
                  <div 
                    key={fileItem ? fileItem.id : `empty-${index}`} 
                    className={`relative aspect-square flex items-center justify-center rounded-lg border-2 border-dashed 
                      ${fileItem 
                        ? 'bg-gray-700 border-gray-600' 
                        : 'bg-gray-800 border-gray-600 hover:border-gray-500'}`}
                  >
                    {fileItem ? (
                      <>
                        {fileItem.preview ? (
                          <img 
                            src={fileItem.preview} 
                            alt={fileItem.file.name}
                            className="h-full w-full object-contain p-2"
                          />
                        ) : (
                          <>
                            {fileCategory === "Timetable" ? (
                              <Calendar className="w-8 h-8 text-blue-400" />
                            ) : (
                              getFileIcon(fileItem.file.type)
                            )}
                          </>
                        )}
                        <button 
                          onClick={() => removeSelectedFile(fileItem.id)}
                          className="absolute top-1 right-1 bg-gray-800/80 hover:bg-gray-700 rounded-full p-1"
                          title="Remove file"
                        >
                          <X size={16} className="text-gray-300" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-gray-900/80 py-1 px-2 truncate text-xs">
                          {fileItem.file.name}
                        </div>
                      </>
                    ) : (
                      index === selectedFiles.length ? (
                        <label className="cursor-pointer flex flex-col items-center justify-center h-full w-full">
                          <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.png,.jpeg,.jpg"
                            disabled={isUploading || selectedFiles.length >= 4}
                          />
                          <FilePlus className="h-8 w-8 text-gray-500 mb-1" />
                          <span className="text-xs text-gray-500">Add File</span>
                        </label>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-gray-600">
                          <div className="h-8 w-8 border-2 border-gray-700 rounded-lg mb-1"></div>
                          <span className="text-xs">Empty</span>
                        </div>
                      )
                    )}
                  </div>
                ))}
              </div>

              {/* Error and status messages */}
              {error && (
                <div className="flex items-center gap-2 text-red-400 text-sm mb-4">
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
              
              {uploadStatus && (
                <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
                  <FileCheck2 size={16} />
                  <span>{uploadStatus}</span>
                </div>
              )}
              
              {/* Upload button */}
              <div className="flex justify-end">
                <button
                  onClick={handleUpload}
                  disabled={selectedFiles.length === 0 || !uploadType || isUploading}
                  className={`px-6 py-2 rounded-lg flex items-center gap-2 ${
                    selectedFiles.length > 0 && uploadType
                      ? "bg-blue-600 hover:bg-blue-700"
                      : "bg-gray-600 cursor-not-allowed opacity-50"
                  }`}
                >
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Upload className="w-5 h-5" />
                  )}
                  <span>
                    {isUploading 
                      ? "Uploading..." 
                      : `Upload ${selectedFiles.length ? `(${selectedFiles.length})` : ""}`}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Documents List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-6">My Documents</h2>
            
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
                <span className="ml-2">Loading documents...</span>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-2" />
                <p className="text-red-400 mb-4">{error}</p>
                <button 
                  onClick={fetchUserDocuments} 
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2"
                >
                  <Loader2 className="w-4 h-4" />
                  Retry
                </button>
              </div>
            ) : (
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {documents.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 col-span-full">
                    <FileText className="w-12 h-12 mx-auto mb-2" />
                    <p>No documents uploaded yet</p>
                  </div>
                ) : (
                  documents.map(doc => (
                    <div
                      key={doc.id}
                      className="bg-gray-700 rounded-lg overflow-hidden hover:bg-gray-600 transition-colors cursor-pointer group"
                      onClick={() => setSelectedDoc(doc)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center">
                            {doc.fileCategory === "Timetable" ? (
                              <Calendar className="w-6 h-6 text-blue-500 mr-2" />
                            ) : (
                              <FileCheck2 className="w-6 h-6 text-blue-500 mr-2" />
                            )}
                            <h3 className="font-medium truncate">{doc.type}</h3>
                          </div>
                          <div className="flex">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleViewDocument(doc.id);
                              }}
                              className="p-1 mr-1 hover:bg-gray-500 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                              title="View document"
                            >
                              <Eye className="w-4 h-4 text-indigo-400" />
                            </button>
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                handleDelete(doc.id);
                              }}
                              className="p-1 hover:bg-gray-500 rounded-full opacity-70 hover:opacity-100 transition-opacity"
                              title="Delete document"
                            >
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 mb-2 truncate">
                          {doc.name}
                        </p>
                        <div className="flex justify-between">
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.size)} • {formatDate(doc.uploadDate)}
                          </p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            doc.fileCategory === "Timetable" 
                              ? "bg-blue-600/30 text-blue-200" 
                              : "bg-gray-600 text-gray-300"
                          }`}>
                            {doc.fileCategory}
                          </span>
                        </div>
                      </div>
                      <div className="px-4 py-2 bg-gray-600/50 text-sm text-gray-400 flex items-center justify-between">
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Details Modal */}
      {selectedDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gray-800 p-6 border-b border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Document Details</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleViewDocument(selectedDoc.id)}
                  className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1"
                  disabled={viewLoading}
                >
                  {viewLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                  <span>View</span>
                </button>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="p-2 hover:bg-gray-700 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-300">
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Document Type</p>
                    <p className="font-medium">{selectedDoc.type}</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">File Category</p>
                    <p className="font-medium">{selectedDoc.fileCategory}</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">File Name</p>
                    <p className="font-medium">{selectedDoc.name}</p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">File Size</p>
                    <p className="font-medium">
                      {formatFileSize(selectedDoc.size)}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Upload Date</p>
                    <p className="font-medium">
                      {formatDate(selectedDoc.uploadDate)}
                    </p>
                  </div>
                  <div className="bg-gray-700/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">File Type</p>
                    <p className="font-medium">{selectedDoc.fileType}</p>
                  </div>
                </div>
              </div>

              {/* Document Details */}
              {selectedDoc.details && Object.keys(selectedDoc.details).length > 0 ? (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-gray-300">
                    Document Information
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(selectedDoc.details).map(([key, field]) => (
                      <div key={key} className="bg-gray-700/50 p-4 rounded-lg">
                        <p className="text-sm text-gray-400">{key}</p>
                        <p className="font-medium">
                          {typeof field === 'object' && field.value 
                            ? field.value 
                            : field}
                        </p>
                        {field.confidence && (
                          <div className="mt-1.5 flex items-center">
                            <div className="h-1.5 flex-1 bg-gray-600 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" 
                                style={{width: `${Math.min(field.confidence * 100, 100)}%`}}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-400 ml-2">
                              {Math.round(field.confidence * 100)}%
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-gray-700/30 rounded-lg p-4 flex items-center justify-center">
                  <p className="text-gray-400">No additional document details available</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DocManage;
