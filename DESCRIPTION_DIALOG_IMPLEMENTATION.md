# Description Field - Move to Save Dialog

## Summary
Move description field from top form to a popup dialog that appears when user clicks Save button.

## Changes Needed

### 1. Add Dialog Import (Line 8)
```typescript
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
```

### 2. Add State Variables (Around line 98)
```typescript
const [showSaveDialog, setShowSaveDialog] = useState(false);
const [tempDescription, setTempDescription] = useState<string>('');
```

### 3. Remove Description Field from Form (Around line 451-462)
**DELETE these lines:**
```typescript
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Description</label>
                    <Input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Enter project description"
                    />
                  </div>
```

### 4. Update Save Button (Around line 393)
**CHANGE FROM:**
```typescript
<Button onClick={handleSave} disabled={isSaving} className="flex items-center gap-2">
```

**TO:**
```typescript
<Button onClick={() => {
  setTempDescription(description);
  setShowSaveDialog(true);
}} disabled={isSaving} className="flex items-center gap-2">
```

### 5. Add Dialog Before Closing </div> (Around line 532, BEFORE last </div>)
```typescript
      {/* Save Dialog with Description */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Project</DialogTitle>
            <DialogDescription>
              Add a description for your project (optional)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Project Description</label>
              <Textarea
                value={tempDescription}
                onChange={(e) => setTempDescription(e.target.value)}
                placeholder="Enter project description..."
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={async () => {
              setDescription(tempDescription);
              setShowSaveDialog(false);
              await handleSave();
            }} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
```

## Result
- Description field removed from top form (between Kategori and Tahun)
- When user clicks "Save & Version" button, dialog pops up
- User fills description in dialog
- Click "Save Project" to save with description
- Or "Cancel" to abort

## Testing
1. Open WebsiteBuilder page
2. Write some code
3. Click "Save & Version" button
4. Dialog appears with description textarea
5. Fill description
6. Click "Save Project"
7. Project saves with description
