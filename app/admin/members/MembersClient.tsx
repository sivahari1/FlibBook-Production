'use client'

import { useState } from 'react'
import MembersTable from '@/components/admin/MembersTable'
import MemberDetails from '@/components/admin/MemberDetails'

interface Member {
  id: string
  email: string
  name: string | null
  emailVerified: boolean
  emailVerifiedAt: Date | null
  createdAt: Date
  freeDocumentCount: number
  paidDocumentCount: number
  isActive: boolean
}

interface MembersClientProps {
  members: Member[]
}

export default function MembersClient({ members }: MembersClientProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const handleViewDetails = (memberId: string) => {
    setSelectedMemberId(memberId)
  }

  const handleCloseDetails = () => {
    setSelectedMemberId(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Member Management
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          View and manage all jstudyroom members
        </p>
      </div>

      <MembersTable 
        members={members} 
        onViewDetails={handleViewDetails}
      />

      {selectedMemberId && (
        <MemberDetails
          memberId={selectedMemberId}
          onClose={handleCloseDetails}
        />
      )}
    </div>
  )
}
