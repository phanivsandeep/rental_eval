import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { KeyboardSensor } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { saveProfile } from '@/lib/api'
import { useAppStore } from '@/store'
import type {
  UserProfile,
  Transportation,
  Household,
  WorkSchedule,
  EvaluationDimension,
} from '@/types'

const FOOD_OPTIONS = [
  'Indian', 'Chinese', 'Japanese', 'Korean', 'Mexican', 'Italian',
  'Mediterranean', 'Ethiopian', 'Thai', 'Vegan', 'Vegetarian', 'Halal', 'Kosher',
]
const EXERCISE_OPTIONS = ['daily gym', 'outdoor running', 'cycling', 'yoga', 'occasional', 'none']
const OUTDOOR_OPTIONS = ['hiking', 'parks', 'cycling', 'water sports', 'sports courts', 'none']

const DIMENSION_LABELS: Record<EvaluationDimension, string> = {
  safety: '🛡️ Safety',
  transportation: '🚌 Transportation',
  food: '🛒 Food & Grocery',
  lifestyle: '🏃 Lifestyle & Wellness',
  convenience: '🏥 Convenience & Services',
  utilities: '💡 Utilities & Cost',
  building: '🏠 Building & Landlord',
  future_risk: '📈 Future Risk',
}

const ALL_DIMENSIONS: EvaluationDimension[] = [
  'safety', 'transportation', 'food', 'lifestyle',
  'convenience', 'utilities', 'building', 'future_risk',
]

// ─── Sortable row ─────────────────────────────────────────────────────────────

function SortableItem({ id, rank }: { id: EvaluationDimension; rank: number }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-lg border px-3 py-2 bg-background select-none"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="text-xs text-muted-foreground w-5 font-mono">{rank}</span>
      <span className="flex-1 text-sm">{DIMENSION_LABELS[id]}</span>
    </div>
  )
}

// ─── Main form ────────────────────────────────────────────────────────────────

interface ProfileFormProps {
  initial?: UserProfile | null
  onSaved?: () => void
  /** When true, skip API call and just update local store (guest mode) */
  guestMode?: boolean
}

export function ProfileForm({ initial, onSaved, guestMode }: ProfileFormProps) {
  const setProfile = useAppStore((s) => s.setProfile)

  const [form, setForm] = useState<UserProfile>({
    ethnicity: initial?.ethnicity ?? '',
    food_preferences: initial?.food_preferences ?? [],
    exercise_routine: initial?.exercise_routine ?? '',
    outdoor_preferences: initial?.outdoor_preferences ?? [],
    work_schedule: initial?.work_schedule ?? '9-5',
    work_location: initial?.work_location ?? '',
    transportation: initial?.transportation ?? 'car',
    household: initial?.household ?? 'solo',
    has_pets: initial?.has_pets ?? false,
    pet_type: initial?.pet_type ?? '',
    budget: initial?.budget ?? 2000,
    health_conditions: initial?.health_conditions ?? [],
    priorities: initial?.priorities ?? [...ALL_DIMENSIONS],
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [healthInput, setHealthInput] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setForm((f) => {
      const oldIndex = f.priorities.indexOf(active.id as EvaluationDimension)
      const newIndex = f.priorities.indexOf(over.id as EvaluationDimension)
      return { ...f, priorities: arrayMove(f.priorities, oldIndex, newIndex) }
    })
  }

  function toggleList<T extends string>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item]
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      if (guestMode) {
        setProfile(form)
      } else {
        const res = await saveProfile(form)
        setProfile(res.profile)
      }
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto">
      {/* Identity */}
      <Card>
        <CardHeader><CardTitle className="text-base">About You</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Cultural / Ethnic Background</Label>
            <Input
              placeholder="e.g. South Asian, East Asian, Latin…"
              value={form.ethnicity ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, ethnicity: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Household Type</Label>
            <Select
              value={form.household}
              onValueChange={(v) => setForm((f) => ({ ...f, household: v as Household }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">Solo</SelectItem>
                <SelectItem value="couple">Couple</SelectItem>
                <SelectItem value="family">Family with kids</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Pets?</Label>
            <div className="flex gap-2">
              {(['No pets', 'Yes, I have pets'] as const).map((opt, i) => (
                <Button
                  key={opt}
                  type="button"
                  variant={form.has_pets === (i === 1) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, has_pets: i === 1 }))}
                >
                  {opt}
                </Button>
              ))}
            </div>
            {form.has_pets && (
              <Input
                placeholder="Pet type (dog, cat, etc.)"
                value={form.pet_type ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, pet_type: e.target.value }))}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Food */}
      <Card>
        <CardHeader><CardTitle className="text-base">Food Preferences</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {FOOD_OPTIONS.map((opt) => (
              <Badge
                key={opt}
                variant={form.food_preferences.includes(opt) ? 'default' : 'outline'}
                className="cursor-pointer select-none"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    food_preferences: toggleList(f.food_preferences, opt),
                  }))
                }
              >
                {opt}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Lifestyle */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lifestyle & Activity</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Exercise Routine</Label>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_OPTIONS.map((opt) => (
                <Badge
                  key={opt}
                  variant={form.exercise_routine === opt ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() => setForm((f) => ({ ...f, exercise_routine: opt }))}
                >
                  {opt}
                </Badge>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Outdoor Preferences</Label>
            <div className="flex flex-wrap gap-2">
              {OUTDOOR_OPTIONS.map((opt) => (
                <Badge
                  key={opt}
                  variant={form.outdoor_preferences.includes(opt) ? 'default' : 'outline'}
                  className="cursor-pointer select-none"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      outdoor_preferences: toggleList(f.outdoor_preferences, opt),
                    }))
                  }
                >
                  {opt}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Work & Transport */}
      <Card>
        <CardHeader><CardTitle className="text-base">Work & Transportation</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Work Schedule</Label>
            <Select
              value={form.work_schedule}
              onValueChange={(v) => setForm((f) => ({ ...f, work_schedule: v as WorkSchedule }))}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="9-5">9–5 in office</SelectItem>
                <SelectItem value="remote">Remote / WFH</SelectItem>
                <SelectItem value="night_shift">Night shift</SelectItem>
                <SelectItem value="irregular">Irregular hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Work Location Address</Label>
            <Input
              placeholder="123 Tech Drive, San Jose CA"
              value={form.work_location ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, work_location: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Transportation</Label>
            <div className="flex gap-2 flex-wrap">
              {(['car', 'no_car', 'ev'] as Transportation[]).map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  variant={form.transportation === opt ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setForm((f) => ({ ...f, transportation: opt }))}
                >
                  {{ car: '🚗 I have a car', no_car: '🚌 No car', ev: '⚡ EV' }[opt]}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budget */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex justify-between">
            Monthly Rent Budget
            <span className="text-primary font-mono">${form.budget?.toLocaleString()}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Slider
            min={500}
            max={6000}
            step={100}
            value={[form.budget ?? 2000]}
            onValueChange={([v]) => setForm((f) => ({ ...f, budget: v }))}
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>$500</span><span>$6,000</span>
          </div>
        </CardContent>
      </Card>

      {/* Health */}
      <Card>
        <CardHeader><CardTitle className="text-base">Health Considerations</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Optional — helps agents flag proximity needs (e.g. specialist clinics, air quality).
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="e.g. asthma, mobility issues…"
              value={healthInput}
              onChange={(e) => setHealthInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (healthInput.trim()) {
                    setForm((f) => ({
                      ...f,
                      health_conditions: [...f.health_conditions, healthInput.trim()],
                    }))
                    setHealthInput('')
                  }
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (healthInput.trim()) {
                  setForm((f) => ({
                    ...f,
                    health_conditions: [...f.health_conditions, healthInput.trim()],
                  }))
                  setHealthInput('')
                }
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {form.health_conditions.map((c, i) => (
              <Badge key={i} variant="secondary" className="gap-1">
                {c}
                <button
                  type="button"
                  className="ml-1 opacity-60 hover:opacity-100"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      health_conditions: f.health_conditions.filter((_, j) => j !== i),
                    }))
                  }
                >
                  ×
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Priority Rankings — drag to reorder */}
      <Card>
        <CardHeader><CardTitle className="text-base">Priority Ranking</CardTitle></CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Drag to reorder — agents weight scores based on what matters most to you.
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={form.priorities}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-1">
                {form.priorities.map((dim, i) => (
                  <SortableItem key={dim} id={dim} rank={i + 1} />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </CardContent>
      </Card>

      <Separator />

      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" size="lg" disabled={loading}>
        {loading ? 'Saving…' : guestMode ? 'Use This Profile' : 'Save Profile'}
      </Button>
    </form>
  )
}
