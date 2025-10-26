import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Save, Settings, Files, Globe, Code2, Maximize, ExternalLink, X, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useProjects } from '@/hooks/useProjects';
import { useSiteVersions, SiteVersion } from '@/hooks/useSiteVersions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ProjectFilesView } from '@/components/website-builder/ProjectFilesView';
import { SupabaseSettings } from '@/components/website-builder/SupabaseSettings';
import { DomainManagement } from '@/components/website-builder/DomainManagement';
import { FileManager } from '@/utils/fileManager';
import { toast } from 'sonner';

const DEFAULT_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Website</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 500px;
        }
        h1 {
            color: #333;
            margin-bottom: 1rem;
        }
        p {
            color: #666;
            line-height: 1.6;
        }
        .button {
            background: #667eea;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 1rem;
        }
        .button:hover {
            background: #5a6fd8;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Welcome to Your Website!</h1>
        <p>Paste any HTML, CSS, JavaScript, React JSX, or other web code here and see it run instantly!</p>
        <button class="button" onclick="alert('Hello World!')">Click Me!</button>
    </div>
    
    <script>
        console.log('Website loaded successfully!');
    </script>
</body>
</html>`;

const WebsiteBuilder = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const { user } = useAuth();
  const { projects, createProject, updateProject, fetchProjects } = useProjects();
  const { createVersion } = useSiteVersions(projectId);

  // Initialize with empty string, will load actual content in useEffect
  const [code, setCode] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [currentProject, setCurrentProject] = useState<any>(null);
  const [isFullPreview, setIsFullPreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [kategori, setKategori] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [tahun, setTahun] = useState<number | undefined>(undefined);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [tempDescription, setTempDescription] = useState<string>("");
  const fullPreviewIframeRef = useRef<HTMLIFrameElement>(null);

  // Load project on mount and when projectId changes
  useEffect(() => {
    const loadProject = async () => {
      setIsLoading(true);
      
      try {
        // If we have a projectId, load that specific project
        if (projectId) {
          // Directly fetch this specific project from database
          const { data: projectData, error } = await supabase
            .from('projects')
            .select('*')
            .eq('id', projectId)
            .single();
          
          if (error) {
            console.error('Error fetching project:', error);
            toast.error('Failed to load project');
            setCode(DEFAULT_HTML);
            setIsLoading(false);
            return;
          }
          
          if (projectData) {
            setCurrentProject(projectData);
            // Load from database - this is the source of truth for editing
            if (projectData.code_content) {
              setCode(projectData.code_content);
            } else {
              setCode(DEFAULT_HTML);
            }
            // Load kategori, description, and tahun values
            setKategori(projectData.kategori || '');
            setDescription(projectData.description || '');
            setTahun(projectData.tahun || undefined);
          } else {
            // Project not found, load default
            setCode(DEFAULT_HTML);
            toast.error('Project not found');
          }
          setIsLoading(false);
        } else {
          // No projectId, check for test project or load default
          const testCode = localStorage.getItem('test-project-code');
          if (testCode) {
            setCode(testCode);
            setCurrentProject({
              id: 'test-project',
              title: 'Test Project',
              code_content: testCode,
              created_at: new Date().toISOString()
            });
          } else {
            setCode(DEFAULT_HTML);
          }
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Error loading project:', error);
        setCode(DEFAULT_HTML);
        setIsLoading(false);
      }
    };

    loadProject();
  }, [projectId]); // Remove projects dependency to avoid infinite loop

  const processCode = () => {
    return code;
  };

  const updatePreview = () => {
    const processedCode = processCode();
    
    // Update main iframe
    if (iframeRef.current) {
      iframeRef.current.srcdoc = processedCode;
    }
    
    // Update full preview iframe if it exists
    if (fullPreviewIframeRef.current) {
      fullPreviewIframeRef.current.srcdoc = processedCode;
    }
  };

  const openInNewTab = () => {
    const processedCode = processCode();
    const blob = new Blob([processedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openInWebsiteMode = async () => {
    if (!currentProject || !currentProject.id) {
      toast.error('Please save your project first to use Website Mode');
      return;
    }

    if (currentProject.id === 'test-project') {
      const fileUrl = FileManager.getProjectFileUrl(currentProject.id);
      const websiteWindow = window.open(fileUrl, '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,width=1200,height=800');
      
      if (websiteWindow) {
        toast.success('Website opened! Login and save for permanent URLs.');
      } else {
        toast.error('Please allow pop-ups to use Website Mode');
      }
    } else {
      try {
        const { data: publicData } = supabase.storage
          .from('websites')
          .getPublicUrl(`${currentProject.id}/index.html`);

        const publicUrl = publicData?.publicUrl;
        if (!publicUrl) {
          toast.error('Failed to resolve public website URL');
          return;
        }

        const websiteWindow = window.open(publicUrl, '_blank', 'toolbar=yes,scrollbars=yes,resizable=yes,width=1200,height=800');
        
        if (websiteWindow) {
          toast.success('Website opened in a new window!');
        } else {
          toast.error('Please allow pop-ups to use Website Mode');
        }
      } catch (error) {
        console.error('Error opening website mode:', error);
        toast.error('Failed to open website mode. Please try again.');
      }
    }
  };

  // Update preview when code changes (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      updatePreview();
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [code]);

  // Handle ESC key for full preview mode
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullPreview) {
        setIsFullPreview(false);
      }
    };

    if (isFullPreview) {
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'unset';
    };
  }, [isFullPreview]);

  const handleSave = async () => {
    if (!code.trim()) {
      toast.error('Please add some code before saving');
      return;
    }

    setIsSaving(true);
    try {
      let project = currentProject;

      // Create or update project in database
      if (!project || project.id === 'test-project') {
        const title = `Website - ${new Date().toLocaleDateString()}`;
        project = await createProject({
          title,
          description: description || 'A website built with the code editor',
          code_content: code,
          language: 'html',
          is_public: true,  // Make public by default for sharing
          kategori: kategori || undefined,
          tahun: tahun || undefined,
        });
        
        if (!project) {
          throw new Error('Failed to create project');
        }
        setCurrentProject(project);
        
        // Navigate to the new project URL
        navigate(`/website-builder/${project.id}`);
      } else {
        // Update existing project in database
        project = await updateProject(project.id, {
          code_content: code,
          description: description || undefined,
          is_public: true,  // Make public for sharing
          kategori: kategori || undefined,
          tahun: tahun || undefined,
          updated_at: new Date().toISOString()
        });
      }

      // Save the HTML file to storage for preview (with proper Blob)
      if (project) {
        // Get user's sequential ID if available
        let sequentialId = null;
        if (user?.id) {
          try {
            const { data: seqData } = await supabase
              .from('user_sequences')
              .select('sequential_id')
              .eq('user_id', user.id)
              .maybeSingle(); // Use maybeSingle() instead of single() to avoid 406 errors
            
            if (seqData?.sequential_id) {
              sequentialId = seqData.sequential_id;
            }
          } catch (err) {
            console.log('No sequential ID found');
          }
        }

        // Save to storage with proper HTML Blob
        const saved = await FileManager.createProjectFile(
          project.id,
          project.title,
          code,
          user?.id,
          sequentialId
        );
        
        if (saved) {
          console.log('File saved to storage successfully');
        }
      }

      toast.success('Project saved successfully!');
      updatePreview();
    } catch (error) {
      console.error('Error saving:', error);
      toast.error('Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickSave = async () => {
    // Just call handleSave for now
    await handleSave();
  };

  const handleEditVersion = (version: SiteVersion) => {
    setCode(version.html_content);
    toast.success(`Loaded version ${version.version_number} for editing`);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="border-b bg-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Code2 className="h-5 w-5" />
            Code Editor
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {currentProject && currentProject.id !== 'test-project' && (
            <>
              <Button 
                variant="outline" 
                onClick={() => {
                  const url = `/${currentProject.id}/${currentProject.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
                  window.open(url, '_blank');
                }} 
                className="flex items-center gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
            </>
          )}
          <Button onClick={() => {
            setTempDescription(description);
            setShowSaveDialog(true);
          }} disabled={isSaving} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save & Version'}
          </Button>
        </div>
      </header>

      <div className="flex-1 flex">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Code Editor Panel */}
          <ResizablePanel defaultSize={30} minSize={20}>
            <div className="h-full flex flex-col">
              <div className="border-b px-4 py-3">
                <h3 className="text-sm font-medium">Code Editor</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Paste any HTML, CSS, JavaScript, React JSX, or other web code
                </p>
              </div>
              <div className="flex-1 p-4">
                <Textarea
                  placeholder="Paste your code here... HTML, CSS, JavaScript, React JSX, or any web code will work!"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="h-full resize-none font-mono text-sm"
                />
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle />

          {/* Preview Panel */}
          <ResizablePanel defaultSize={70} minSize={30}>
            <div className="h-full flex flex-col">
              {/* Project Metadata */}
              <div className="border-b p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="text-sm font-medium mb-2 block">Kategori</label>
                    <Select value={kategori} onValueChange={setKategori}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Matematik">Matematik</SelectItem>
                        <SelectItem value="Sejarah">Sejarah</SelectItem>
                        <SelectItem value="Sains">Sains</SelectItem>
                        <SelectItem value="Bahasa Melayu">Bahasa Melayu</SelectItem>
                        <SelectItem value="Bahasa Inggeris">Bahasa Inggeris</SelectItem>
                        <SelectItem value="Pendidikan Islam">Pendidikan Islam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button variant="outline" size="sm" className="h-10">
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                </div>
              </div>
              
              <Tabs defaultValue="preview" className="flex-1 flex flex-col">
                <div className="border-b px-4 py-2">
                  <TabsList className="h-9">
                    <TabsTrigger value="preview" className="text-xs">
                      <Eye className="h-3 w-3 mr-1" />
                      Live Preview
                    </TabsTrigger>
                  </TabsList>
                </div>

              <TabsContent value="preview" className="flex-1 relative overflow-hidden m-0">
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setIsFullPreview(true)}
                    className="shadow-md"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0"
                  title="Preview"
                />
              </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Full Screen Preview Modal */}
      {isFullPreview && (
        <div className="fixed inset-0 z-50 bg-background">
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={openInNewTab}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsFullPreview(false)}
            >
              <X className="h-4 w-4 mr-2" />
              Exit Preview
            </Button>
          </div>
          <iframe
            ref={fullPreviewIframeRef}
            className="w-full h-full border-0"
            title="Full Preview"
            srcDoc={code}
          />
        </div>
      )}

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
    </div>
  );
};

export default WebsiteBuilder;