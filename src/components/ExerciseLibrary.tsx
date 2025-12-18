import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Dumbbell, Video, Edit, Trash2, Upload, X } from 'lucide-react';
import { exercisesApi, Exercise } from '../utils/api';
import { LoadingScreen } from './LoadingScreen';
import { supabase } from '../lib/supabase';

export function ExerciseLibrary() {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newExercise, setNewExercise] = useState({ name: '', category: '', videoUrl: '', instructions: '' });
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load exercises from API on mount
  useEffect(() => {
    loadExercises();
  }, []);

  const loadExercises = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await exercisesApi.getAll();
      setExercises(data);
    } catch (err) {
      console.error('Failed to load exercises:', err);
      setError('Failed to load exercises. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingExercise) {
        // Update existing exercise
        const updated = await exercisesApi.update(editingExercise.id, {
          name: newExercise.name,
          category: newExercise.category,
          videoUrl: newExercise.videoUrl || undefined,
          instructions: newExercise.instructions || undefined,
        });
        setExercises(exercises.map((ex) => 
          ex.id === editingExercise.id ? updated : ex
        ));
        setEditingExercise(null);
      } else {
        // Add new exercise
        const exercise = await exercisesApi.create({
          name: newExercise.name,
          category: newExercise.category,
          videoUrl: newExercise.videoUrl || undefined,
          instructions: newExercise.instructions || undefined,
        });
        setExercises([...exercises, exercise]);
      }
      
      setNewExercise({ name: '', category: '', videoUrl: '', instructions: '' });
      setSelectedVideoFile(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setShowModal(false);
    } catch (err) {
      console.error('Failed to save exercise:', err);
      alert('Failed to save exercise. Please try again.');
    }
  };

  const handleEditExercise = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setNewExercise({
      name: exercise.name,
      category: exercise.category || '',
      videoUrl: exercise.videoUrl || '',
      instructions: exercise.instructions || '',
    });
    setSelectedVideoFile(null);
    setVideoPreview(null);
    setShowModal(true);
  };

  const handleDeleteExercise = async (exerciseId: string) => {
    if (!confirm('Are you sure you want to delete this exercise?')) {
      return;
    }

    try {
      await exercisesApi.delete(exerciseId);
      setExercises(exercises.filter((ex) => ex.id !== exerciseId));
    } catch (err) {
      console.error('Failed to delete exercise:', err);
      alert('Failed to delete exercise. Please try again.');
    }
  };

  const handleVideoFile = (file: File) => {
    // Validate file type
    const validTypes = [
      'video/mp4',
      'video/quicktime', // .mov files
      'video/x-msvideo', // .avi
      'video/x-matroska', // .mkv
      'video/webm',
      'video/3gpp', // .3gp
      'video/x-m4v', // .m4v
    ];

    const validExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.3gp', '.m4v'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      alert('Invalid file type. Please select a video file (mp4, mov, avi, mkv, webm, 3gp, m4v).');
      return;
    }

    // Validate file size (500MB max)
    if (file.size > 500 * 1024 * 1024) {
      alert('File size is too large. Maximum file size is 500MB.');
      return;
    }

    setSelectedVideoFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setVideoPreview(previewUrl);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleVideoFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragActive) {
      setIsDragActive(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  };

  const handleUploadVideo = async () => {
    if (!selectedVideoFile) return;

    try {
      setUploadingVideo(true);
      // Start with a small non-zero progress so the UI shows activity
      setUploadProgress(10);

      // Ensure Supabase is configured
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        alert('Video upload is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
        setUploadingVideo(false);
        setUploadProgress(0);
        return;
      }

      // Generate a unique file path for this upload
      const originalName = selectedVideoFile.name;
      const ext = '.' + (originalName.split('.').pop() || 'mp4');
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const filePath = `${baseName}-${uniqueSuffix}${ext}`;

      const { data, error } = await supabase.storage
        .from('videos')
        .upload(filePath, selectedVideoFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: selectedVideoFile.type || 'video/mp4',
        });

      if (error || !data) {
        console.error('Supabase video upload error:', error);
        alert('Failed to upload video. Please try again.');
        setUploadingVideo(false);
        setUploadProgress(0);
        return;
      }

      // Bump progress near completion while we fetch the public URL
      setUploadProgress(90);

      const { data: publicData } = supabase.storage
        .from('videos')
        .getPublicUrl(data.path);

      const fullVideoUrl = publicData.publicUrl;

      setNewExercise({ ...newExercise, videoUrl: fullVideoUrl });
      setSelectedVideoFile(null);
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
        setVideoPreview(null);
      }
      setUploadProgress(100);
      setUploadingVideo(false);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      console.error('Failed to upload video:', err);
      alert('Failed to upload video. Please try again.');
      setUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveVideo = () => {
    setSelectedVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
    setNewExercise({ ...newExercise, videoUrl: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExercise(null);
    setNewExercise({ name: '', category: '', videoUrl: '', instructions: '' });
    setSelectedVideoFile(null);
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
      setVideoPreview(null);
    }
  };

  // Filter exercises based on search term
  const filteredExercises = exercises.filter(exercise =>
    exercise.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadExercises}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl">Exercise Library</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Exercise
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Exercises Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredExercises.length === 0 ? (
          <div className="col-span-full text-center text-gray-400 py-12">
            {searchTerm ? 'No exercises found matching your search.' : 'No exercises in library. Add your first exercise!'}
          </div>
        ) : (
          filteredExercises.map((exercise) => (
            <div
              key={exercise.id}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                    <Dumbbell className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-white">{exercise.name}</h3>
                    {exercise.category && (
                      <p className="text-xs text-gray-500 mt-1">{exercise.category}</p>
                    )}
                  </div>
                </div>
              </div>
              {exercise.videoUrl && (
                <div className="flex items-center gap-2 text-sm text-emerald-400 mb-2">
                  <Video className="w-4 h-4" />
                  Video attached
                </div>
              )}
              <div className="flex gap-2 mt-4 pt-4 border-t border-zinc-800">
                <button
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
                  onClick={() => handleEditExercise(exercise)}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-red-500 transition-colors ml-auto"
                  onClick={() => handleDeleteExercise(exercise.id)}
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Exercise Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h3 className="text-white text-xl mb-4">{editingExercise ? 'Edit Exercise' : 'Add New Exercise'}</h3>
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Exercise Name</label>
                <input
                  type="text"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              {/* Video Upload Section */}
              <div>
                <label className="block text-gray-400 mb-2">Video</label>
                <div className="space-y-3">
                  {/* File Upload */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 hover:border-orange-500/50 transition-colors ${
                      isDragActive ? 'border-orange-500 bg-orange-500/10' : 'border-zinc-700'
                    }`}
                    onDragOver={handleDragOver}
                    onDragEnter={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      id="video-upload"
                      disabled={uploadingVideo}
                      style={{ display: 'none' }}
                    />
                    <label
                      htmlFor="video-upload"
                      className="flex flex-col items-center justify-center cursor-pointer"
                    >
                      {selectedVideoFile ? (
                        <div className="w-full">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-white">
                              <Video className="w-5 h-5 text-orange-500" />
                              <span className="text-sm">{selectedVideoFile.name}</span>
                            </div>
                            {!uploadingVideo && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleRemoveVideo();
                                }}
                                className="text-gray-400 hover:text-red-500"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                          {videoPreview && !uploadingVideo && (
                            <video
                              src={videoPreview}
                              controls
                              className="w-full max-h-48 rounded-lg mb-2"
                            />
                          )}
                          {uploadingVideo ? (
                            <div className="w-full">
                              <div className="flex items-center justify-between text-sm text-gray-400 mb-1">
                                <span>Uploading...</span>
                                <span>{Math.round(uploadProgress)}%</span>
                              </div>
                              <div className="w-full bg-zinc-800 rounded-full h-2">
                                <div
                                  className="bg-orange-500 h-2 rounded-full transition-all"
                                  style={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                handleUploadVideo();
                              }}
                              className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                              Upload Video
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-center">
                          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-sm text-gray-400 mb-1">
                            Click or drag a video file here
                          </p>
                          <p className="text-xs text-gray-500">
                            MP4, MOV, AVI, MKV, WebM, 3GP, M4V (max 500MB)
                          </p>
                        </div>
                      )}
                    </label>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-zinc-700"></div>
                    <span className="text-xs text-gray-500">OR</span>
                    <div className="flex-1 border-t border-zinc-700"></div>
                  </div>

                  {/* URL Input */}
                  <div>
                    <input
                      type="url"
                      value={newExercise.videoUrl}
                      onChange={(e) => setNewExercise({ ...newExercise, videoUrl: e.target.value })}
                      className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                      placeholder="Enter video URL (https://...)"
                    />
                  </div>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg transition-colors"
                >
                  {editingExercise ? 'Save Changes' : 'Add Exercise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}