import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Users, Search, Globe, ExternalLink, Eye, Calendar, Lock, Unlock, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getUsersInfo } from '@/utils/communityUtils';
import { formatTimeAgo } from '@/utils/userUtils';
import { toast } from 'sonner';
import { KATEGORI_OPTIONS } from '@/components/website-builder/CategorySelector';

interface CommunityProject {
  id: number;
  title: string;
  description?: string;
  code_content: string;
  is_public: boolean;
  is_community_visible: boolean;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_username?: string;
  kategori?: string;
  tahun?: number;
  domains: Array<{
    domain_name: string;
    status: string;
  }>;
}

const ProjectCommunity = () => {
  const [projects, setProjects] = useState<CommunityProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKategori, setSelectedKategori] = useState<string>('all');
  const [selectedTahun, setSelectedTahun] = useState<string>('all');
  const [userProjects, setUserProjects] = useState<Set<number>>(new Set());
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch all public community projects
  useEffect(() => {
    fetchCommunityProjects();
  }, [user]);

  const fetchCommunityProjects = async () => {
    try {
      // Get all public projects with community visibility
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select(`
          id,
          title,
          description,
          code_content,
          is_public,
          is_community_visible,
          created_at,
          user_id,
          kategori,
          tahun
        `)
        .eq('is_public', true)
        .eq('is_community_visible', true)
        .order('created_at', { ascending: false });

      console.log('Projects fetched:', projectsData);
      
      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      // Get user information - Simplified approach
      const userIds = [...new Set(projectsData?.map(p => p.user_id) || [])];
      const userInfo = await getUsersInfo(userIds);
      
      console.log('👥 User info fetched:', userInfo);

      console.log('Fetched projects:', projectsData);
      console.log('Error:', error);

      if (error) {
        console.error('Error fetching projects:', error);
        return;
      }

      // Get domains for each project
      const projectIds = projectsData?.map(p => p.id) || [];
      const { data: domainsData } = await supabase
        .from('custom_domains')
        .select('project_id, domain_name, status')
        .in('project_id', projectIds);

      // Don't filter again - projectsData already filtered by is_community_visible=true
      const visibleProjects = projectsData || [];

      // Combine data with cleaned user information
      const projectsWithDomains = visibleProjects.map(project => ({
        ...project,
        user_email: userInfo[project.user_id] || 'Anonymous',
        user_username: userInfo[project.user_id] || 'Anonymous',
        domains: domainsData?.filter(d => d.project_id === project.id) || []
      }));

      setProjects(projectsWithDomains);

      // Track user's own projects
      if (user) {
        const userProjectIds = projectsData
          ?.filter(p => p.user_id === user.id)
          .map(p => p.id) || [];
        setUserProjects(new Set(userProjectIds));
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to load community projects');
    } finally {
      setLoading(false);
    }
  };

  // Toggle project visibility in community
  const toggleCommunityVisibility = async (projectId: number, currentVisibility: boolean) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ is_community_visible: !currentVisibility })
        .eq('id', projectId)
        .eq('user_id', user?.id);

      if (!error) {
        toast.success(currentVisibility ? 'Project hidden from community' : 'Project shared with community');
        fetchCommunityProjects();
      } else {
        toast.error('Failed to update visibility');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to update visibility');
    }
  };

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.domains.some(d => d.domain_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesKategori = !selectedKategori || selectedKategori === 'all' || project.kategori === selectedKategori;
    const matchesTahun = !selectedTahun || selectedTahun === 'all' || project.tahun?.toString() === selectedTahun;
    
    return matchesSearch && matchesKategori && matchesTahun;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="flex items-center gap-2">
              <Users className="h-6 w-6" />
              <h1 className="text-2xl font-bold">Project Community</h1>
            </div>
            <Badge variant="secondary" className="ml-2">
              {filteredProjects.length} Projects
            </Badge>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects or domains..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={selectedKategori} onValueChange={setSelectedKategori}>
                <SelectTrigger className="w-48">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    <SelectValue placeholder="Filter by Category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {KATEGORI_OPTIONS.map((kategori) => (
                    <SelectItem key={kategori} value={kategori}>
                      {kategori}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedTahun} onValueChange={setSelectedTahun}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {Array.from(new Set(projects.map(p => p.tahun).filter(Boolean)))
                    .sort((a, b) => (b || 0) - (a || 0))
                    .map((year) => (
                      <SelectItem key={year} value={year!.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Active Filters */}
          {((selectedKategori && selectedKategori !== 'all') || (selectedTahun && selectedTahun !== 'all')) && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              {selectedKategori && selectedKategori !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedKategori}
                  <button
                    onClick={() => setSelectedKategori('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {selectedTahun && selectedTahun !== 'all' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedTahun}
                  <button
                    onClick={() => setSelectedTahun('all')}
                    className="ml-1 hover:bg-muted-foreground/20 rounded-full p-0.5"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedKategori('');
                  setSelectedTahun('');
                }}
                className="text-xs"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Projects Grid */}
        {filteredProjects.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">No community projects yet</p>
              <p className="text-sm text-muted-foreground">
                Projects shared by users will appear here
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <Card key={project.id} className="relative overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {project.title}
                        {userProjects.has(project.id) && (
                          <Badge variant="outline" className="text-xs">
                            Your Project
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTimeAgo(project.created_at)}
                        </span>
                      </CardDescription>
                    </div>
                    {userProjects.has(project.id) && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleCommunityVisibility(project.id, project.is_community_visible)}
                        title={project.is_community_visible ? "Hide from community" : "Share with community"}
                      >
                        {project.is_community_visible ? (
                          <Unlock className="h-4 w-4" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Domains */}
                  {project.domains.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {project.domains.slice(0, 2).map((domain, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm">
                          <Globe className="h-3 w-3 text-muted-foreground" />
                          <a
                            href={`https://${domain.domain_name}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-blue-600 hover:underline flex items-center gap-1"
                          >
                            {domain.domain_name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      ))}
                      {project.domains.length > 2 && (
                        <span className="text-xs text-muted-foreground">
                          +{project.domains.length - 2} more domains
                        </span>
                      )}
                    </div>
                  )}

                  {/* Category and Year */}
                  {(project.kategori || project.tahun) && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      {project.kategori && (
                        <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-200 text-xs">
                          {project.kategori}
                        </Badge>
                      )}
                      {project.tahun && (
                        <Badge variant="outline" className="border-green-200 text-green-700 text-xs">
                          {project.tahun}
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        const slug = project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
                        window.open(`/${project.id}/${slug}`, '_blank');
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    {project.domains.length > 0 && (
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => window.open(`https://${project.domains[0].domain_name}`, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Visit Site
                      </Button>
                    )}
                  </div>

                  {/* Creator - Show username prominently */}
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <span className="text-gray-400">By:</span>
                      <span className="font-medium text-gray-600">{project.user_username}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCommunity;