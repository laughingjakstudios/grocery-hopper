'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Copy, Check, Link2, X, UserMinus, RefreshCw } from 'lucide-react'
import { generateShareLink, revokeShareLink, getListMembers, removeListMember } from '../actions'

type MemberRaw = {
  id: string
  role: string
  joined_at: string
  user_id: string
  profiles: {
    id: string
    email: string
    full_name: string | null
    avatar_url: string | null
  }
}

type Member = MemberRaw

interface ShareListDialogProps {
  listId: string
  listName: string
  shareCode: string | null
  onClose: () => void
}

export function ShareListDialog({ listId, listName, shareCode: initialShareCode, onClose }: ShareListDialogProps) {
  const [shareCode, setShareCode] = useState(initialShareCode)
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [copied, setCopied] = useState(false)

  const shareUrl = shareCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${shareCode}`
    : null

  useEffect(() => {
    loadMembers()
  }, [listId])

  async function loadMembers() {
    const result = await getListMembers(listId)
    if (result.success && result.members) {
      // Transform the data - profiles comes as object from the join
      const transformedMembers = (result.members as unknown[]).map((m: unknown) => {
        const member = m as {
          id: string
          role: string
          joined_at: string
          user_id: string
          profiles: { id: string; email: string; full_name: string | null; avatar_url: string | null }
        }
        return member
      })
      setMembers(transformedMembers)
    }
    setLoading(false)
  }

  async function handleGenerateLink() {
    setGenerating(true)
    const result = await generateShareLink(listId)
    if (result.success && result.shareCode) {
      setShareCode(result.shareCode)
    }
    setGenerating(false)
  }

  async function handleRevokeLink() {
    if (confirm('This will disable the current share link. Anyone with the link will no longer be able to join. Continue?')) {
      await revokeShareLink(listId)
      setShareCode(null)
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (confirm(`Remove ${memberName} from this list?`)) {
      const result = await removeListMember(listId, memberId)
      if (result.success) {
        setMembers(prev => prev.filter(m => m.user_id !== memberId))
      }
    }
  }

  async function handleCopyLink() {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const editors = members.filter(m => m.role === 'editor')
  const owner = members.find(m => m.role === 'owner')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Share "{listName}"</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Share Link Section */}
        <div className="mb-6 space-y-3">
          <label className="text-sm font-medium text-gray-700">Share Link</label>

          {shareCode ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  value={shareUrl || ''}
                  readOnly
                  className="bg-gray-50 text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateLink}
                  disabled={generating}
                  className="text-xs"
                >
                  <RefreshCw className={`mr-1 h-3 w-3 ${generating ? 'animate-spin' : ''}`} />
                  New Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRevokeLink}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Disable Link
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Anyone with this link can join as an editor
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleGenerateLink}
                disabled={generating}
                className="w-full"
              >
                <Link2 className="mr-2 h-4 w-4" />
                {generating ? 'Generating...' : 'Generate Share Link'}
              </Button>
              <p className="text-xs text-gray-500">
                Create a link that others can use to join this list
              </p>
            </div>
          )}
        </div>

        {/* Members Section */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Members ({members.length})
          </label>

          {loading ? (
            <p className="text-sm text-gray-500">Loading members...</p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto">
              {/* Owner */}
              {owner && (
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-700">
                      {(owner.profiles.full_name || owner.profiles.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {owner.profiles.full_name || owner.profiles.email}
                      </p>
                      <p className="text-xs text-gray-500">{owner.profiles.email}</p>
                    </div>
                  </div>
                  <Badge>Owner</Badge>
                </div>
              )}

              {/* Editors */}
              {editors.map(member => (
                <div key={member.id} className="flex items-center justify-between rounded-lg bg-gray-50 p-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-700">
                      {(member.profiles.full_name || member.profiles.email)[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.profiles.full_name || member.profiles.email}
                      </p>
                      <p className="text-xs text-gray-500">{member.profiles.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Editor</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMember(
                        member.user_id,
                        member.profiles.full_name || member.profiles.email
                      )}
                      title="Remove member"
                    >
                      <UserMinus className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              {editors.length === 0 && (
                <p className="text-center text-sm text-gray-500 py-2">
                  No one else has joined yet. Share the link above!
                </p>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6">
          <Button variant="outline" onClick={onClose} className="w-full">
            Done
          </Button>
        </div>
      </div>
    </div>
  )
}
