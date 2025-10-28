import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProjects } from '@/hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Calendar, User, LogOut, Trash2, Edit, Globe, ChevronDown, Eye, FileEdit, Link, Copy, ExternalLink, RefreshCw, CheckCircle, Users, EyeOff, Lock, Unlock, CreditCard } from 'lucide-react';
import { cleanEmailForDisplay, formatTimeAgo } from '@/utils/userUtils';
import { FileManager } from '@/utils/fileManager';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { verifyDomain } from '@/utils/dnsVerification';
import { addDomainToVercel, removeDomainFromVercel } from '@/utils/vercelApi';

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { projects, loading, deleteProject, updateProject } = useProjects();
  const navigate = useNavigate();
  const [editingProject, setEditingProject] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [domainProject, setDomainProject] = useState<any>(null);
  const [customDomain, setCustomDomain] = useState('');
  const [projectDomains, setProjectDomains] = useState<Record<number, any[]>>({});
  const [isAddingDomain, setIsAddingDomain] = useState(false);
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set());
  const [togglingVisibility, setTogglingVisibility] = useState<Set<number>>(new Set());
  const [processingPayment, setProcessingPayment] = useState<Set<number>>(new Set());

  // Function to toggle project visibility in community
  const handleToggleCommunityVisibility = async (projectId: number, currentVisibility: boolean) => {
    setTogglingVisibility(prev => new Set(prev).add(projectId));
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_community_visible: !currentVisibility })
        .eq('id', projectId)
        .eq('user_id', user?.id);

      if (!error) {
        toast.success(currentVisibility ? 'Project hidden from community' : 'Project shared with community');
        // Refresh projects to update the UI
        await updateProject(projectId, { is_community_visible: !currentVisibility });
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (err) {
      console.error('Error toggling visibility:', err);
      toast.error('Failed to update visibility');
    } finally {
      setTogglingVisibility(prev => {
        const updated = new Set(prev);
        updated.delete(projectId);
        return updated;
      });
    }
  };

  // Function to verify a domain's DNS
  const handleVerifyDomain = async (domain: any) => {
    setVerifyingDomains(prev => new Set(prev).add(domain.id));
    
    try {
      const isValid = await verifyDomain(domain.domain_name);
      
      if (isValid) {
        // Add domain to Vercel
        toast.info(`Adding ${domain.domain_name} to Vercel...`);
        const vercelResult = await addDomainToVercel(domain.domain_name);
        
        if (!vercelResult.success) {
          // If domain already exists in Vercel, that's OK
          if (!vercelResult.error?.includes('already')) {
            toast.error(`Vercel: ${vercelResult.error}`);
            setVerifyingDomains(prev => {
              const updated = new Set(prev);
              updated.delete(domain.id);
              return updated;
            });
            return;
          }
        }
        
        // Update domain status to active
        const { error } = await supabase
          .from('custom_domains')
          .update({ 
            status: 'active',
            verified_at: new Date().toISOString(),
            error_message: null
          })
          .eq('id', domain.id);
        
        if (!error) {
          toast.success(`Domain ${domain.domain_name} verified and activated!`);
          
          // Update local state
          setProjectDomains(prev => {
            const updated = { ...prev };
            if (updated[domain.project_id]) {
              updated[domain.project_id] = updated[domain.project_id].map((d: any) =>
                d.id === domain.id ? { ...d, status: 'active', verified_at: new Date().toISOString() } : d
              );
            }
            return updated;
          });
        }
      } else {
        toast.error(`DNS not configured correctly for ${domain.domain_name}. Please check your DNS settings.`);
        
        // Update error message
        await supabase
          .from('custom_domains')
          .update({ 
            error_message: 'DNS verification failed. Please ensure DNS records point to Vercel.',
            updated_at: new Date().toISOString()
          })
          .eq('id', domain.id);
      }
    } catch (error) {
      console.error('Verification error:', error);
      toast.error('Failed to verify domain');
    } finally {
      setVerifyingDomains(prev => {
        const updated = new Set(prev);
        updated.delete(domain.id);
        return updated;
      });
    }
  };

  // Function to remove a domain
  const handleRemoveDomain = async (domain: any) => {
    if (!confirm(`Are you sure you want to remove ${domain.domain_name}?`)) {
      return;
    }
    
    try {
      // Remove from Vercel if active
      if (domain.status === 'active') {
        toast.info('Removing domain from Vercel...');
        const vercelResult = await removeDomainFromVercel(domain.domain_name);
        if (!vercelResult.success && !vercelResult.error?.includes('not found')) {
          toast.error(`Vercel: ${vercelResult.error}`);
        }
      }
      
      // Remove from database
      const { error } = await supabase
        .from('custom_domains')
        .delete()
        .eq('id', domain.id);
      
      if (!error) {
        toast.success(`Domain ${domain.domain_name} removed successfully`);
        
        // Update local state
        setProjectDomains(prev => {
          const updated = { ...prev };
          if (updated[domain.project_id]) {
            updated[domain.project_id] = updated[domain.project_id].filter((d: any) => d.id !== domain.id);
          }
          return updated;
        });
      } else {
        toast.error('Failed to remove domain');
      }
    } catch (error) {
      console.error('Error removing domain:', error);
      toast.error('Failed to remove domain');
    }
  };

  // Fetch existing domains for all projects
  useEffect(() => {
    const fetchProjectDomains = async () => {
      if (!projects || projects.length === 0) return;
      
      try {
        const projectIds = projects.map((p: any) => p.id);
        const { data, error } = await supabase
          .from('custom_domains')
          .select('*')
          .in('project_id', projectIds);
        
        if (data && !error) {
          const domainsByProject = data.reduce((acc: any, domain: any) => {
            if (!acc[domain.project_id]) {
              acc[domain.project_id] = [];
            }
            acc[domain.project_id].push(domain);
            return acc;
          }, {});
          setProjectDomains(domainsByProject);
        }
      } catch (err) {
        console.error('Error fetching domains:', err);
      }
    };

    fetchProjectDomains();
  }, [projects]); // Added projects dependency

  useEffect(() => {
    if (editingProject) {
      setNewTitle(editingProject.title);
    }
  }, [editingProject]); // Added this useEffect to handle editingProject changes

  // Toggle project community visibility
  const toggleCommunityVisibility = async (project: any) => {
    try {
      const newVisibility = project.is_community_visible === false ? true : false;
      const { data, error } = await supabase
        .from('projects')
        .update({ is_community_visible: newVisibility })
        .eq('id', project.id)
        .eq('user_id', user?.id)
        .select()
        .single();

      if (!error && data) {
        toast.success(newVisibility ? 'Project shared with community' : 'Project hidden from community');
        // Update the local projects state instead of reloading
        const updatedProjects = projects.map((p: any) => 
          p.id === project.id ? { ...p, is_community_visible: newVisibility } : p
        );
        // Force a re-render with updated projects
        window.location.reload();
      } else {
        console.error('Update error:', error);
        toast.error('Failed to update visibility');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update visibility');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteProject = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this project? This will also delete the associated HTML file.')) {
      // Delete the file first
      await FileManager.deleteProjectFile(id.toString(), user?.id);
      // Then delete from database
      await deleteProject(id);
      toast.success('Project and associated files deleted successfully');
    }
  };

  const handleRenameProject = async () => {
    if (!editingProject || !newTitle.trim()) return;
    
    setIsRenaming(true);
    try {
      // Update project in database
      await updateProject(editingProject.id, {
        title: newTitle,
        updated_at: new Date().toISOString()
      });
      
      // Update the file with new name
      const projectFile = FileManager.getProjectFile(editingProject.id);
      if (projectFile) {
        await FileManager.renameProject(
          editingProject.id,
          editingProject.title,
          newTitle,
          projectFile.content,
          user?.id
        );
      }
      
      toast.success('Project renamed successfully');
      setEditingProject(null);
      setNewTitle('');
    } catch (error) {
      console.error('Error renaming project:', error);
      toast.error('Failed to rename project');
    } finally {
      setIsRenaming(false);
    }
  };

  const handlePublishProject = async (projectId: number) => {
    if (!user) return;

    setProcessingPayment(prev => new Set(prev).add(projectId));
    toast.dismiss();

    try {
      const loadingToast = toast.loading('Creating payment session...');
      
      // Create payment for this specific project
      const result = await createProjectPayment(user.id, projectId.toString(), 5.00);
      
      toast.dismiss(loadingToast);
      
      if (result && result.payment_url) {
        toast.success('Redirecting to Billplz payment gateway...');
        // Redirect to Billplz payment page
        window.location.href = result.payment_url;
      } else {
        toast.error('Failed to create payment session. Please try again.');
        setProcessingPayment(prev => {
          const next = new Set(prev);
          next.delete(projectId);
          return next;
        });
      }
    } catch (error: any) {
      console.error('Error processing payment:', error);
      toast.dismiss();
      
      let errorMessage = 'Payment processing failed. Please try again.';
      if (error?.message) {
        if (error.message.includes('already published')) {
          errorMessage = 'This project is already published!';
        } else if (error.message.includes('Edge Function')) {
          errorMessage = '⚠️ Payment system not configured. Please contact support.';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { duration: 6000 });
      
      setProcessingPayment(prev => {
        const next = new Set(prev);
        next.delete(projectId);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold">CepatBina</h1>
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">CepatBina</h1>
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/community')}
              className="flex items-center gap-2"
            >
              <Users className="h-4 w-4" />
              Community
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/billing')}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Billing
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2"
            >
              <User className="h-4 w-4" />
              Profile
            </Button>
            {user ? (
              <>
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {cleanEmailForDisplay(user.email) || 'User'}
                </span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold mb-2">Your Projects</h2>
            <p className="text-muted-foreground">
              Create, manage, and share your AI-generated applications
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Project
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate('/website-builder')}>
                <Globe className="h-4 w-4 mr-2" />
                Website Builder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first AI-powered application
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => navigate('/website-builder')}>
                  <Globe className="h-4 w-4 mr-2" />
                  Website Builder
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Card key={project.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{project.title}</CardTitle>
                      {project.description && (
                        <CardDescription className="line-clamp-2">
                          {project.description}
                        </CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCommunityVisibility(project)}
                        title={project.is_community_visible ? "Hide from community" : "Share with community"}
                        className="h-8 w-8 p-0"
                      >
                        {project.is_community_visible ? (
                          <Eye className="h-4 w-4" />
                        ) : (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setEditingProject(project);
                              setNewTitle(project.title);
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteProject(project.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary">{project.language}</Badge>
                      {project.ai_model && (
                        <Badge variant="outline">{project.ai_model}</Badge>
                      )}
                      {project.kategori && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                          {project.kategori}
                        </Badge>
                      )}
                      {project.tahun && (
                        <Badge variant="outline" className="border-green-200 text-green-700">
                          {project.tahun}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatTimeAgo(project.updated_at)}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const url = `/${project.id}/${slug}`;
                        const fullUrl = `${window.location.origin}${url}`;
                        navigator.clipboard.writeText(fullUrl);
                        toast.success('URL copied to clipboard!');
                      }}
                      className="flex items-center gap-1"
                    >
                      <Copy className="h-4 w-4" />
                      Copy URL
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        const url = `/${project.id}/${slug}`;
                        window.open(url, '_blank');
                      }}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-4 w-4" />
                      Preview
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => navigate(`/website-builder/${project.id}`)}
                    >
                      <Globe className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                  </div>
                  
                  {/* Publish Button */}
                  <div className="mt-3 pt-3 border-t">
                    {!project.is_paid ? (
                      <Button
                        className="w-full bg-green-600 hover:bg-green-700"
                        onClick={() => handlePublishProject(project.id)}
                        disabled={processingPayment.has(project.id)}
                      >
                        <Rocket className="h-4 w-4 mr-2" />
                        {processingPayment.has(project.id) ? 'Processing...' : 'Publish Project - RM 5.00'}
                      </Button>
                    ) : (
                      <div className="flex items-center justify-center gap-2 py-2 px-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-600">Published</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Domain Section - Railway Style */}
                  <div className="mt-4 pt-4 border-t">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <div className="flex items-center gap-2">
                        <Link className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground text-xs truncate max-w-[250px]" title={`${window.location.host}/${project.id}/${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {window.location.host}/{project.id}/{project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => {
                          setDomainProject(project);
                          setCustomDomain('');
                        }}
                      >
                        Add Domain
                      </Button>
                    </div>
                    
                    {/* Show existing custom domains */}
                    {projectDomains[project.id] && projectDomains[project.id].length > 0 && (
                      <div className="mt-2 space-y-1">
                        {projectDomains[project.id].map((domain: any) => (
                          <div key={domain.id} className="flex items-center justify-between text-xs group">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                              <span className="font-mono">{domain.domain_name}</span>
                              <Badge 
                                variant={domain.status === 'active' ? 'default' : 
                                        domain.status === 'pending' ? 'secondary' : 'destructive'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {domain.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              {domain.status === 'pending' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => handleVerifyDomain(domain)}
                                  disabled={verifyingDomains.has(domain.id)}
                                  title="Verify DNS"
                                >
                                  {verifyingDomains.has(domain.id) ? (
                                    <RefreshCw className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <CheckCircle className="h-3 w-3" />
                                  )}
                                </Button>
                              )}
                              {domain.status === 'active' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 p-0"
                                  onClick={() => window.open(`https://${domain.domain_name}`, '_blank')}
                                  title="Visit site"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleRemoveDomain(domain)}
                                title="Remove domain"
                              >
                                <Trash2 className="h-3 w-3 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Rename Dialog */}
      <Dialog open={!!editingProject} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
            <DialogDescription>
              Enter a new name for your project. This will also update the file name.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="col-span-3"
                placeholder="Enter project name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProject(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject} disabled={isRenaming || !newTitle.trim()}>
              {isRenaming ? 'Renaming...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Domain Dialog - Railway Style */}
      <Dialog open={!!domainProject} onOpenChange={(open) => !open && setDomainProject(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Custom Domain</DialogTitle>
            <DialogDescription>
              Connect your custom domain to project: {domainProject?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="domain">Enter your domain</Label>
              <Input
                id="domain"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="yourdomain.com or subdomain.yourdomain.com"
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your domain without http:// or https://
              </p>
            </div>
            
            {customDomain && (
              <div className="space-y-4">
                <div className="space-y-2 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-lg">📋</span> Step 1: Configure DNS Records
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Add these DNS records at your domain provider (Namecheap, GoDaddy, Cloudflare, etc.)
                  </p>
                  
                  <div className="space-y-3 mt-3">
                    {/* Option for root domain */}
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs font-semibold mb-2">For root domain ({customDomain}):</p>
                      <div className="space-y-1 font-mono text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="text-muted-foreground">Name:</span>
                          <span className="text-muted-foreground">Value:</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="bg-muted px-2 py-1 rounded">A</span>
                          <span className="bg-muted px-2 py-1 rounded">@</span>
                          <span className="bg-muted px-2 py-1 rounded select-all">76.76.21.21</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="bg-muted px-2 py-1 rounded">A</span>
                          <span className="bg-muted px-2 py-1 rounded">@</span>
                          <span className="bg-muted px-2 py-1 rounded select-all">76.76.21.61</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Option for www subdomain */}
                    <div className="p-3 bg-background rounded border">
                      <p className="text-xs font-semibold mb-2">For www subdomain (www.{customDomain}):</p>
                      <div className="space-y-1 font-mono text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="text-muted-foreground">Name:</span>
                          <span className="text-muted-foreground">Value:</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <span className="bg-muted px-2 py-1 rounded">CNAME</span>
                          <span className="bg-muted px-2 py-1 rounded">www</span>
                          <span className="bg-muted px-2 py-1 rounded select-all">cname.vercel-dns.com</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-lg">⏱️</span> Step 2: Wait for DNS Propagation
                  </h4>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    <li>• DNS changes typically take 1-2 hours to propagate</li>
                    <li>• In some cases, it may take up to 48 hours</li>
                    <li>• Check status at: <span className="text-blue-600 dark:text-blue-400">whatsmydns.net</span></li>
                  </ul>
                </div>
                
                <div className="space-y-2 p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <span className="text-lg">✅</span> Step 3: Verify Domain
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Once DNS is configured, click "Add Domain" below. SSL certificate will be automatically provisioned.
                  </p>
                </div>
                
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs font-semibold mb-2">Need help? Common domain providers:</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <strong>Namecheap:</strong> Domain List → Manage → Advanced DNS
                    </div>
                    <div>
                      <strong>GoDaddy:</strong> My Products → DNS → Manage
                    </div>
                    <div>
                      <strong>Cloudflare:</strong> Select domain → DNS tab
                    </div>
                    <div>
                      <strong>Hostinger:</strong> Domains → Manage → DNS
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDomainProject(null);
              setCustomDomain('');
            }}>
              Cancel
            </Button>
            <Button 
              onClick={async () => {
                if (customDomain && domainProject) {
                  setIsAddingDomain(true);
                  
                  try {
                    // Normalize domain (remove http://, trailing slashes, etc.)
                    let normalizedDomain = customDomain.toLowerCase().trim();
                    normalizedDomain = normalizedDomain.replace(/^https?:\/\//, '');
                    normalizedDomain = normalizedDomain.replace(/\/$/, '');
                    
                    // Check if domain already exists
                    const { data: existingDomain } = await supabase
                      .from('custom_domains')
                      .select('id')
                      .eq('domain_name', normalizedDomain)
                      .single();
                    
                    if (existingDomain) {
                      toast.error('This domain is already registered');
                      setIsAddingDomain(false);
                      return;
                    }
                    
                    // Generate verification token
                    const verificationToken = `verify_${Math.random().toString(36).substring(7)}`;
                    
                    // Save domain to database
                    const { data, error } = await supabase
                      .from('custom_domains')
                      .insert({
                        project_id: domainProject.id,
                        user_id: user?.id,
                        domain_name: normalizedDomain,
                        status: 'pending',
                        verification_token: verificationToken,
                        dns_instructions: {
                          type: 'A',
                          records: [
                            { type: 'A', name: '@', value: '76.76.21.21' },
                            { type: 'A', name: '@', value: '76.76.21.61' }
                          ],
                          cname: { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }
                        }
                      })
                      .select()
                      .single();
                    
                    if (error) {
                      console.error('Error saving domain:', error);
                      toast.error('Failed to add domain');
                    } else {
                      toast.success('Domain added successfully! Please configure DNS as shown.');
                      
                      // Update local state
                      setProjectDomains(prev => ({
                        ...prev,
                        [domainProject.id]: [...(prev[domainProject.id] || []), data]
                      }));
                      
                      // Also save www version if main domain
                      if (!normalizedDomain.startsWith('www.')) {
                        await supabase
                          .from('custom_domains')
                          .insert({
                            project_id: domainProject.id,
                            user_id: user?.id,
                            domain_name: `www.${normalizedDomain}`,
                            status: 'pending',
                            verification_token: verificationToken,
                            dns_instructions: {
                              type: 'CNAME',
                              records: [
                                { type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }
                              ]
                            }
                          });
                      }
                    }
                  } catch (err) {
                    console.error('Error:', err);
                    toast.error('Something went wrong');
                  } finally {
                    setIsAddingDomain(false);
                    setDomainProject(null);
                    setCustomDomain('');
                  }
                }
              }}
              disabled={!customDomain || isAddingDomain}
            >
              {isAddingDomain ? 'Adding...' : 'Add Domain'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;