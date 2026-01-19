
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { firestore, storage, auth } from '@/firebase'
import { onAuthStateChanged } from 'firebase/auth'

interface FormData {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  residentialAddress: string
  city: string
  country: string
  loanAmount: string
  loanPurpose: string
  repaymentDuration: string
}

interface FileUploads {
  governmentId: File | null
  proofOfAddress: File | null
  selfie: File | null
}

export default function LoanApplicationPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    residentialAddress: '',
    city: '',
    country: '',
    loanAmount: '',
    loanPurpose: '',
    repaymentDuration: '6',
  })

  const [files, setFiles] = useState<FileUploads>({
    governmentId: null,
    proofOfAddress: null,
    selfie: null,
  })

  const [declarations, setDeclarations] = useState({
    accurateInfo: false,
    termsAndConditions: false,
    identityVerification: false,
  })

  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState('')

  // Check authentication and pre-fill email
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user)
        setFormData(prev => ({
          ...prev,
          email: user.email || '',
          fullName: user.displayName || '',
        }))
      } else {
        router.push('/login?redirect=/apply')
      }
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, fieldName: keyof FileUploads) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${fieldName} file must be less than 10MB`)
        e.target.value = ''
        return
      }
      setFiles(prev => ({ ...prev, [fieldName]: file }))
      setError('')
    }
  }

  const handleDeclarationChange = (name: keyof typeof declarations) => {
    setDeclarations(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const validateForm = (): boolean => {
    // Personal Information
    if (!formData.fullName.trim()) {
      setError('Full Name is required')
      return false
    }
    if (!formData.email.trim()) {
      setError('Email Address is required')
      return false
    }
    if (!formData.phone.trim()) {
      setError('Phone Number is required')
      return false
    }
    if (!formData.dateOfBirth) {
      setError('Date of Birth is required')
      return false
    }

    // Address Information
    if (!formData.residentialAddress.trim()) {
      setError('Residential Address is required')
      return false
    }
    if (!formData.city.trim()) {
      setError('City is required')
      return false
    }
    if (!formData.country.trim()) {
      setError('Country is required')
      return false
    }

    // Loan Details
    if (!formData.loanAmount.trim() || parseFloat(formData.loanAmount) <= 0) {
      setError('Valid Loan Amount is required')
      return false
    }
    if (!formData.loanPurpose.trim()) {
      setError('Loan Purpose is required')
      return false
    }

    // Identity Verification Files
    if (!files.governmentId) {
      setError('Government-Issued ID is required')
      return false
    }
    if (!files.proofOfAddress) {
      setError('Proof of Address is required')
      return false
    }
    if (!files.selfie) {
      setError('Selfie / Live Photo is required')
      return false
    }

    // Declarations
    if (!declarations.accurateInfo) {
      setError('Please confirm that the information provided is accurate')
      return false
    }
    if (!declarations.termsAndConditions) {
      setError('Please agree to the Terms & Conditions')
      return false
    }
    if (!declarations.identityVerification) {
      setError('Please consent to identity verification')
      return false
    }

    return true
  }

  const uploadFile = async (file: File, fileName: string, path: string): Promise<string> => {
    const timestamp = Date.now()
    const sanitizedFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    const storageRef = ref(storage, `${path}/${sanitizedFileName}`)
    
    await uploadBytes(storageRef, file)
    const downloadURL = await getDownloadURL(storageRef)
    
    return downloadURL
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    console.log('=== FORM SUBMISSION STARTED ===')

    if (!validateForm()) {
      console.log('❌ Validation failed')
      return
    }
    console.log('✅ Validation passed')

    if (!currentUser) {
      console.log('❌ No user logged in')
      setError('You must be logged in to submit an application')
      router.push('/login?redirect=/apply')
      return
    }
    console.log('✅ User authenticated:', currentUser.email)

    setIsSubmitting(true)

    try {
      const userId = currentUser.uid
      const basePath = `loan-applications/${userId}`
      console.log('📁 Upload path:', basePath)

      // Upload files with progress updates
      console.log('📤 Starting file uploads...')
      
      setUploadProgress('Uploading Government ID...')
      console.log('Uploading Government ID...')
      const governmentIdUrl = await uploadFile(
        files.governmentId!,
        files.governmentId!.name,
        basePath
      )
      console.log('✅ Government ID uploaded:', governmentIdUrl)

      setUploadProgress('Uploading Proof of Address...')
      console.log('Uploading Proof of Address...')
      const proofOfAddressUrl = await uploadFile(
        files.proofOfAddress!,
        files.proofOfAddress!.name,
        basePath
      )
      console.log('✅ Proof of Address uploaded:', proofOfAddressUrl)

      setUploadProgress('Uploading Selfie...')
      console.log('Uploading Selfie...')
      const selfieUrl = await uploadFile(
        files.selfie!,
        files.selfie!.name,
        basePath
      )
      console.log('✅ Selfie uploaded:', selfieUrl)

      setUploadProgress('Saving application...')
      console.log('💾 Saving to Firestore...')

      // Save to Firestore
      const docRef = await addDoc(collection(firestore, 'loanApplications'), {
        // User Identity
        userId: userId,
        userEmail: currentUser.email,

        // Personal Information
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        dateOfBirth: formData.dateOfBirth,

        // Address Information
        residentialAddress: formData.residentialAddress.trim(),
        city: formData.city.trim(),
        country: formData.country.trim(),

        // Loan Details
        loanAmount: parseFloat(formData.loanAmount),
        loanPurpose: formData.loanPurpose.trim(),
        repaymentDuration: parseInt(formData.repaymentDuration),

        // Identity Verification Documents
        documents: {
          governmentId: governmentIdUrl,
          proofOfAddress: proofOfAddressUrl,
          selfie: selfieUrl,
        },

        // Declarations
        declarations: {
          accurateInfo: declarations.accurateInfo,
          termsAndConditions: declarations.termsAndConditions,
          identityVerification: declarations.identityVerification,
          acceptedAt: new Date().toISOString(),
        },

        // Application Status
        status: 'pending',

        // Timestamps
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      console.log('✅ Application saved! Doc ID:', docRef.id)
      console.log('🎉 SUCCESS! Redirecting...')

      // Success - redirect to confirmation page
      router.push(`/application-success?id=${docRef.id}`)

    } catch (error: any) {
      console.error('❌ SUBMISSION ERROR:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Full error:', JSON.stringify(error, null, 2))
      
      if (error.code === 'permission-denied') {
        setError('Permission denied. Please contact support.')
      } else if (error.message?.includes('storage')) {
        setError('Failed to upload documents. Please try again.')
      } else {
        setError(`Failed to submit application: ${error.message || 'Please try again'}`)
      }
    } finally {
      console.log('=== FORM SUBMISSION ENDED ===')
      setIsSubmitting(false)
      setUploadProgress('')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-slate-900 to-slate-800 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <h1 className="text-4xl font-bold text-white mb-2">Loan Application</h1>
          <p className="text-blue-200">
            Complete this form to apply for a loan and verify your identity.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-400 rounded-lg text-red-100 backdrop-blur-sm">
            ⚠️ {error}
          </div>
        )}

        {/* Upload Progress */}
        {uploadProgress && (
          <div className="mb-6 p-4 bg-blue-500/20 border border-blue-400 rounded-lg text-blue-100 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              {uploadProgress}
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 space-y-8">
          
          {/* A. Personal Information */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-blue-200 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-blue-200 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-blue-200 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="+234 800 000 0000"
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-blue-200 mb-2">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  id="dateOfBirth"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </section>

          {/* B. Address Information */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Address Information</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="residentialAddress" className="block text-sm font-medium text-blue-200 mb-2">
                  Residential Address *
                </label>
                <input
                  type="text"
                  id="residentialAddress"
                  name="residentialAddress"
                  value={formData.residentialAddress}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="123 Main Street, Apartment 4B"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-blue-200 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Lagos"
                  />
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-blue-200 mb-2">
                    Country *
                  </label>
                  <input
                    type="text"
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    disabled={isSubmitting}
                    required
                    className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Nigeria"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* C. Loan Details */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Loan Details</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="loanAmount" className="block text-sm font-medium text-blue-200 mb-2">
                  Loan Amount Requested (₦) *
                </label>
                <input
                  type="number"
                  id="loanAmount"
                  name="loanAmount"
                  value={formData.loanAmount}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  min="1"
                  step="0.01"
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white placeholder-blue-300/50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="50000"
                />
              </div>

              <div>
                <label htmlFor="loanPurpose" className="block text-sm font-medium text-blue-200 mb-2">
                  Loan Purpose *
                </label>
                <select
                  id="loanPurpose"
                  name="loanPurpose"
                  value={formData.loanPurpose}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="" className="bg-slate-800 text-gray-400">Select Purpose</option>
                  <option value="business" className="bg-slate-800 text-white">Business</option>
                  <option value="education" className="bg-slate-800 text-white">Education</option>
                  <option value="medical" className="bg-slate-800 text-white">Medical</option>
                  <option value="home" className="bg-slate-800 text-white">Home Improvement</option>
                  <option value="personal" className="bg-slate-800 text-white">Personal</option>
                  <option value="other" className="bg-slate-800 text-white">Other</option>
                </select>
              </div>

              <div>
                <label htmlFor="repaymentDuration" className="block text-sm font-medium text-blue-200 mb-2">
                  Preferred Repayment Duration *
                </label>
                <select
                  id="repaymentDuration"
                  name="repaymentDuration"
                  value={formData.repaymentDuration}
                  onChange={handleInputChange}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 [&>option]:bg-slate-800 [&>option]:text-white"
                >
                  <option value="3" className="bg-slate-800 text-white">3 months</option>
                  <option value="6" className="bg-slate-800 text-white">6 months</option>
                  <option value="12" className="bg-slate-800 text-white">12 months</option>
                  <option value="18" className="bg-slate-800 text-white">18 months</option>
                  <option value="24" className="bg-slate-800 text-white">24 months</option>
                </select>
              </div>
            </div>
          </section>

          {/* D. Identity Verification */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Identity Verification</h2>
            <p className="text-blue-200 mb-4 text-sm">All documents must be clear and valid. Maximum file size: 10MB.</p>
            <div className="space-y-4">
              <div>
                <label htmlFor="governmentId" className="block text-sm font-medium text-blue-200 mb-2">
                  Government-Issued ID * (Passport, National ID, or Driver's License)
                </label>
                <input
                  type="file"
                  id="governmentId"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, 'governmentId')}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {files.governmentId && (
                  <p className="mt-2 text-sm text-green-400">✓ {files.governmentId.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="proofOfAddress" className="block text-sm font-medium text-blue-200 mb-2">
                  Proof of Address * (Utility bill or bank statement)
                </label>
                <input
                  type="file"
                  id="proofOfAddress"
                  accept="image/*,.pdf"
                  onChange={(e) => handleFileChange(e, 'proofOfAddress')}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {files.proofOfAddress && (
                  <p className="mt-2 text-sm text-green-400">✓ {files.proofOfAddress.name}</p>
                )}
              </div>

              <div>
                <label htmlFor="selfie" className="block text-sm font-medium text-blue-200 mb-2">
                  Selfie / Live Photo * (Clear photo of your face)
                </label>
                <input
                  type="file"
                  id="selfie"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e, 'selfie')}
                  disabled={isSubmitting}
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700 disabled:opacity-50"
                />
                {files.selfie && (
                  <p className="mt-2 text-sm text-green-400">✓ {files.selfie.name}</p>
                )}
              </div>
            </div>
          </section>

          {/* E. Declarations & Consent */}
          <section>
            <h2 className="text-2xl font-bold text-white mb-4">Declarations & Consent</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  id="accurateInfo"
                  checked={declarations.accurateInfo}
                  onChange={() => handleDeclarationChange('accurateInfo')}
                  disabled={isSubmitting}
                  required
                  className="mt-1 w-5 h-5 accent-blue-600"
                />
                <label htmlFor="accurateInfo" className="text-white cursor-pointer text-sm">
                  I confirm the information provided is accurate and complete. *
                </label>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  id="termsAndConditions"
                  checked={declarations.termsAndConditions}
                  onChange={() => handleDeclarationChange('termsAndConditions')}
                  disabled={isSubmitting}
                  required
                  className="mt-1 w-5 h-5 accent-blue-600"
                />
                <label htmlFor="termsAndConditions" className="text-white cursor-pointer text-sm">
                  I agree to the{' '}
                  <a href="/terms" target="_blank" className="text-blue-400 underline hover:text-blue-300">
                    Terms & Conditions
                  </a>
                  . *
                </label>
              </div>

              <div className="flex items-start gap-3 p-4 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  id="identityVerification"
                  checked={declarations.identityVerification}
                  onChange={() => handleDeclarationChange('identityVerification')}
                  disabled={isSubmitting}
                  required
                  className="mt-1 w-5 h-5 accent-blue-600"
                />
                <label htmlFor="identityVerification" className="text-white cursor-pointer text-sm">
                  I consent to identity verification and understand my documents will be reviewed. *
                </label>
              </div>
            </div>
          </section>

          {/* F. Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-lg font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Loan Application'
            )}
          </button>

          <p className="text-center text-sm text-blue-300">
            * Required fields
          </p>
        </form>
      </div>
    </div>
  )
}
