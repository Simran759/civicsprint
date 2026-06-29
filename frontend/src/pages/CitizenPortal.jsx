import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGeolocation } from '../hooks/useGeolocation';
import { apiService } from '../services/api';
import { getAddressFromCoords } from '../services/geocode';
import { Upload, MapPin, Mail, AlertTriangle, Sparkles, Loader2, CheckCircle2, Copy, HardHat } from 'lucide-react';

export function CitizenPortal() {
  const navigate = useNavigate();
  const { loading: geoLoading, coordinates, error: geoError, getLocation } = useGeolocation();

  // Form states
  const [citizenEmail, setCitizenEmail] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  // Custom coordinate input overrides
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');

  // Geocoding address states
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [loadingAddress, setLoadingAddress] = useState(false);

  // Processing states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStep, setSubmitStep] = useState(0); // 0 = Idle, 1 = Gemini Vision, 2 = Duplicate, 3 = Resolution Planner
  const [submitError, setSubmitError] = useState(null);
  const [submitResult, setSubmitResult] = useState(null);

  // Ticket Tracking states
  const [activeTab, setActiveTab] = useState('report'); // 'report' or 'track'
  const [trackSearch, setTrackSearch] = useState('');
  const [trackedTickets, setTrackedTickets] = useState([]);
  const [searchingTrack, setSearchingTrack] = useState(false);
  const [trackError, setTrackError] = useState(null);

  const handleTrackSearch = async (e) => {
    e.preventDefault();
    if (!trackSearch.trim()) return;
    setSearchingTrack(true);
    setTrackError(null);
    setTrackedTickets([]);

    try {
      const response = await apiService.getIssues({ limit: 100 });
      if (response.success) {
        const query = trackSearch.trim().toLowerCase();
        const matched = response.issues.filter(
          t => (t.ticketId && t.ticketId.toLowerCase() === query) || 
               (t.verifications && t.verifications.some(v => v.citizenEmail.toLowerCase() === query))
        );
        if (matched.length > 0) {
          setTrackedTickets(matched);
        } else {
          setTrackError('No tickets found matching this Ticket ID or Citizen Email.');
        }
      }
    } catch (err) {
      console.error(err);
      setTrackError('Failed to search tickets. Please ensure the backend is online.');
    } finally {
      setSearchingTrack(false);
    }
  };

  const renderTimeline = (status) => {
    const steps = ['Backlog', 'Ready', 'Assigned', 'In Progress', 'Inspection', 'Resolved', 'Closed'];
    const currentIndex = steps.indexOf(status);

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;

          let dotStyle = 'bg-slate-900 border-slate-800 text-slate-500';
          let textStyle = 'text-slate-500';

          if (isCompleted || status === 'Resolved' && step === 'Resolved' || status === 'Closed' && (step === 'Resolved' || step === 'Closed')) {
            if (idx <= currentIndex) {
              dotStyle = 'bg-emerald-500/10 border-emerald-500/35 text-emerald-400';
              textStyle = 'text-emerald-400 font-bold';
            }
          } else if (isCurrent) {
            dotStyle = 'bg-brand-500/20 border-brand-500 text-brand-400 animate-pulse';
            textStyle = 'text-slate-200 font-extrabold';
          }

          return (
            <div key={step} className="flex-1 flex flex-row sm:flex-col items-center text-center relative w-full">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-mono z-10 ${dotStyle}`}>
                {isCompleted || status === 'Resolved' && step === 'Resolved' || status === 'Closed' && (step === 'Resolved' || step === 'Closed') ? '✓' : idx + 1}
              </div>
              <span className={`text-[10px] uppercase font-bold mt-2 tracking-wider ${textStyle}`}>
                {step}
              </span>
              {idx < steps.length - 1 && (
                <div className={`hidden sm:block absolute left-1/2 top-4 w-full h-[1px] z-0 ${
                  idx < currentIndex ? 'bg-emerald-500/30' : 'bg-slate-900'
                }`}></div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Sync geolocation values to local inputs when geolocation completes
  useEffect(() => {
    if (coordinates) {
      setLatitude(coordinates.latitude.toFixed(6));
      setLongitude(coordinates.longitude.toFixed(6));
    }
  }, [coordinates]);

  // Reverse geocode coordinate inputs automatically
  useEffect(() => {
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      const delayDebounce = setTimeout(async () => {
        setLoadingAddress(true);
        const address = await getAddressFromCoords(lat, lng);
        setResolvedAddress(address);
        setLoadingAddress(false);
      }, 700);

      return () => clearTimeout(delayDebounce);
    } else {
      setResolvedAddress('');
    }
  }, [latitude, longitude]);

  // Handle image drag & drop and select
  const handleImageChange = (file) => {
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageChange(e.dataTransfer.files[0]);
    }
  };

  // Submit report to MERN backend
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitResult(null);

    if (!imageFile) {
      setSubmitError('An image of the civic issue is required.');
      return;
    }
    if (!latitude || !longitude) {
      setSubmitError('GPS Coordinates are required. Please auto-detect or input manually.');
      return;
    }

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('description', description);
    formData.append('latitude', latitude);
    formData.append('longitude', longitude);
    formData.append('citizenEmail', citizenEmail);

    setIsSubmitting(true);

    // Dynamic AI loading sequence simulation
    const steps = [
      'Gemini Vision: Analyzing visual details & categorization...',
      'Duplicate Detection Agent: Scanning neighborhood boundary...',
      'AI Planner: Formulating municipal crews instructions...',
    ];

    setSubmitStep(0);
    const stepInterval = setInterval(() => {
      setSubmitStep((prev) => (prev < steps.length - 1 ? prev + 1 : prev));
    }, 2500);

    try {
      const response = await apiService.createIssue(formData);
      clearInterval(stepInterval);
      setSubmitResult(response);
      
      // Clear form on success
      setCitizenEmail('');
      setDescription('');
      setImageFile(null);
      setImagePreview(null);
      setLatitude('');
      setLongitude('');
    } catch (err) {
      clearInterval(stepInterval);
      setSubmitError(
        err.response?.data?.error || err.response?.data?.details?.[0] || 'An error occurred during submission. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
      setSubmitStep(0);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Visual Header */}
      <div className="text-center mb-10">
        <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 uppercase tracking-wider">
          Hyperlocal Problem Solver
        </span>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-100 mt-3 tracking-tight">
          Report a Community Issue
        </h1>
        <p className="text-slate-400 text-sm mt-3 max-w-md mx-auto">
          Upload an image, describe the issue, and let CivicMind AI handle categorization, duplication checks, and municipal dispatching.
        </p>
        
        {/* Tab Selection */}
        <div className="flex justify-center mt-6">
          <div className="flex bg-slate-900/60 p-1 rounded-xl border border-slate-900">
            <button
              onClick={() => { setActiveTab('report'); setTrackedTickets([]); setTrackError(null); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'report'
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Report New Issue
            </button>
            <button
              onClick={() => { setActiveTab('track'); setTrackSearch(''); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'track'
                  ? 'bg-brand-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Track Ticket Status
            </button>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-slate-900 shadow-2xl relative overflow-hidden">
        {activeTab === 'report' && (
          <>
            {/* Error notification banner */}
            {submitError && (
              <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Success/Duplicate result screen */}
            {submitResult && (
              <div className="text-center py-8">
                {submitResult.alreadyReported ? (
                  <>
                    <div className="w-16 h-16 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mx-auto border border-amber-500/20 mb-6">
                      <AlertTriangle className="w-10 h-10 animate-bounce" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">
                      Duplicate Submission Detected
                    </h2>
                    <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl text-xs font-semibold max-w-md mx-auto text-left flex items-start space-x-2.5">
                      <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <span className="block font-bold mb-0.5">Report Already Filed</span>
                        <span className="text-slate-350 font-normal leading-relaxed">{submitResult.message || 'You have already submitted a report for this issue. City crews are on it!'}</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20 mb-6">
                      <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-100">
                      {submitResult.duplicate ? 'Verification Submitted!' : 'Report Created Successfully!'}
                    </h2>
                    <p className="text-slate-450 text-xs mt-2.5 max-w-md mx-auto leading-normal mb-6">
                      {submitResult.message || (submitResult.duplicate
                        ? 'An identical issue is already active nearby. We have merged your report and escalated severity.'
                        : `A new triage issue has been successfully created under the ${submitResult.issue?.department} department.`)}
                    </p>

                    {/* Fraud Analysis Warning Banner */}
                    {submitResult.issue?.fraudAnalysis?.isAuthentic === false && (
                      <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs max-w-md mx-auto text-left mb-6 flex items-start space-x-2.5">
                        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          <span className="block font-bold mb-0.5">Potential Image Fraud Flagged</span>
                          <span className="text-slate-350 font-normal leading-relaxed block mb-1">
                            {submitResult.issue.fraudAnalysis.fraudNotes || 'Our forensics scan detected that this image may be duplicated, manipulated, or a stock photo.'}
                          </span>
                          <span className="text-red-400/80 font-mono text-[10px]">
                            AI Security Confidence: {submitResult.issue.fraudAnalysis.confidence}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setSubmitResult(null)}
                    className="px-5 py-2.5 rounded-xl border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-sm transition-all"
                  >
                    Report Another Issue
                  </button>
                  <button
                    onClick={() => navigate(`/issues/${submitResult.issue?._id || submitResult.issue?._id}`)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>View AI Resolution Plan</span>
                  </button>
                </div>
              </div>
            )}

            {/* Loading overlay screen */}
            {isSubmitting && (
              <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex flex-col items-center justify-center p-6 text-center">
                <Loader2 className="w-12 h-12 text-brand-400 animate-spin mb-6" />
                <h3 className="text-lg font-bold text-slate-100 mb-2">Processing Report Details</h3>
                
                <div className="w-64 h-1.5 bg-slate-900 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${((submitStep + 1) / 3) * 100}%` }}
                  ></div>
                </div>

                <p className="text-brand-300 text-xs font-semibold animate-pulse">
                  {submitStep === 0
                    ? 'Gemini Vision: Analyzing visual details & categorization...'
                    : submitStep === 1
                    ? 'Duplicate Detection Agent: Scanning neighborhood boundary...'
                    : 'AI Planner: Formulating municipal crews instructions...'}
                </p>
                <p className="text-slate-500 text-[10px] mt-8 max-w-xs">
                  Analyzing photo metadata, executing geospatial matching, and querying generative pipelines. This may take up to 15 seconds.
                </p>
              </div>
            )}

            {/* Report Form */}
            {!submitResult && !isSubmitting && (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Citizen info email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Citizen Email Address
                  </label>
                  <div className="relative rounded-xl shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-slate-500" />
                    </div>
                    <input
                      type="email"
                      name="email"
                      id="email"
                      required
                      value={citizenEmail}
                      onChange={(e) => setCitizenEmail(e.target.value)}
                      className="block w-full pl-10 pr-4 py-3 bg-slate-950/60 border border-slate-900 rounded-xl text-sm placeholder-slate-500 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                      placeholder="Enter your email to receive status updates"
                    />
                  </div>
                </div>

                {/* Image upload zone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Upload Photo Evidence
                  </label>
                  <div
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleDrop}
                    className="border-2 border-dashed border-slate-800 rounded-2xl hover:border-brand-500/50 bg-slate-950/40 p-6 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 min-h-[220px]"
                    onClick={() => document.getElementById('image-upload-input').click()}
                  >
                    <input
                      type="file"
                      id="image-upload-input"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageChange(e.target.files?.[0])}
                    />
                    
                    {imagePreview ? (
                      <div className="relative w-full max-h-56 rounded-xl overflow-hidden group">
                        <img
                          src={imagePreview}
                          alt="Local report preview"
                          className="w-full h-full object-contain bg-slate-900 rounded-xl border border-slate-800"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl">
                          <p className="text-white text-xs font-semibold">Change Image</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <div className="p-3 bg-slate-900 rounded-xl w-fit mx-auto mb-3 border border-slate-800">
                          <Upload className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="text-sm font-semibold text-slate-300">Drag and drop file here, or click to browse</p>
                        <p className="text-xs text-slate-500 mt-1">Supports PNG, JPG, JPEG, or WEBP up to 10MB</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Geolocation Fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      GPS Coordinates
                    </label>
                    <button
                      type="button"
                      onClick={getLocation}
                      disabled={geoLoading}
                      className="inline-flex items-center space-x-1 px-3 py-1 rounded bg-brand-500/10 border border-brand-500/20 text-brand-300 hover:bg-brand-500/20 text-xs font-bold transition-all disabled:opacity-50"
                    >
                      {geoLoading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <MapPin className="w-3.5 h-3.5" />
                      )}
                      <span>Detect Location</span>
                    </button>
                  </div>

                  {geoError && (
                    <p className="text-[11px] text-amber-400 font-semibold mb-2">{geoError}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="Latitude (e.g. 37.7749)"
                        value={latitude}
                        onChange={(e) => setLatitude(e.target.value)}
                        className="block w-full px-4 py-3 bg-slate-950/60 border border-slate-900 rounded-xl text-sm placeholder-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="Longitude (e.g. -122.4194)"
                        value={longitude}
                        onChange={(e) => setLongitude(e.target.value)}
                        className="block w-full px-4 py-3 bg-slate-950/60 border border-slate-900 rounded-xl text-sm placeholder-slate-600 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Resolved Street Address Alert Badge */}
                  {(resolvedAddress || loadingAddress) && (
                    <div className="mt-3 p-3 bg-slate-950/80 rounded-xl border border-slate-900 flex items-center space-x-2 text-xs transition-all duration-300">
                      <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                      {loadingAddress ? (
                        <span className="text-slate-500 flex items-center">
                          <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                          Resolving street address...
                        </span>
                      ) : (
                        <span className="text-slate-300 font-medium">{resolvedAddress}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Description Textarea */}
                <div>
                  <label htmlFor="description" className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                    Issue Description
                  </label>
                  <textarea
                    name="description"
                    id="description"
                    rows="4"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="block w-full px-4 py-3 bg-slate-950/60 border border-slate-900 rounded-xl text-sm placeholder-slate-500 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500 focus:border-brand-500 transition-all resize-none"
                    placeholder="Briefly describe the civic issue, e.g., 'Large pothole on the center lane of Broadway St, dangerous for cyclists.'"
                  ></textarea>
                </div>

                {/* Form Submit */}
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-6 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm shadow-lg shadow-brand-500/20 hover:shadow-brand-500/35 transition-all flex items-center justify-center space-x-2 border border-brand-400/20"
                  >
                    <Sparkles className="w-4.5 h-4.5 animate-pulse text-emerald-300" />
                    <span>Submit Citizen Report</span>
                  </button>
                </div>
              </form>
            )}
          </>
        )}

        {/* Ticket Tracking View */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            <form onSubmit={handleTrackSearch} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Search by Ticket ID or Email
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={trackSearch}
                    onChange={(e) => setTrackSearch(e.target.value)}
                    placeholder="e.g. ROAD-102 or citizen@gmail.com"
                    className="flex-1 px-4 py-3 bg-slate-950/60 border border-slate-900 rounded-xl text-sm placeholder-slate-650 text-slate-200 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  />
                  <button
                    type="submit"
                    disabled={searchingTrack}
                    className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white text-xs font-bold shadow-lg"
                  >
                    {searchingTrack ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </div>
            </form>

            {trackError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium flex items-center space-x-2 animate-pulse">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {trackedTickets.length > 0 && (
              <div className="space-y-6 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
                {trackedTickets.map((ticket) => {
                  const isBreached = ticket.slaStatus === 'Breached' || (ticket.status !== 'Resolved' && ticket.status !== 'Closed' && ticket.dueDate && new Date() > new Date(ticket.dueDate));
                  return (
                    <div key={ticket._id} className="p-6 bg-slate-950/50 rounded-2xl border border-slate-900 shadow-xl space-y-6 text-left">
                      <div className="flex flex-wrap items-center justify-between border-b border-slate-900 pb-3 gap-2">
                        <div>
                          <span className="text-[10px] font-mono text-slate-350 font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-850">
                            {ticket.ticketId || 'TICKET-ID'}
                          </span>
                          <h3 className="text-sm font-bold text-slate-200 mt-1.5">{ticket.title}</h3>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isBreached ? 'bg-red-500/15 text-red-400 border-red-500/25' : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                        }`}>
                          {isBreached ? 'SLA Breached' : 'SLA Active'}
                        </span>
                      </div>

                      {/* Details Roster */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Dept</span>
                          <span className="text-slate-300 font-medium mt-0.5 block">{ticket.department}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Worker</span>
                          <span className="text-slate-350 font-medium mt-0.5 block">{ticket.assignedWorker || 'AI Triage'}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Due Date</span>
                          <span className="text-slate-350 mt-0.5 block">{ticket.dueDate ? new Date(ticket.dueDate).toLocaleDateString() : 'TBD'}</span>
                        </div>
                        <div>
                          <span className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider">Story Points</span>
                          <span className="text-slate-300 font-medium mt-0.5 block">{ticket.storyPoints} SPs</span>
                        </div>
                      </div>

                      {/* Visual Timeline Stepper */}
                      <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-900/60">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Live Sprint Status Timeline</span>
                        {renderTimeline(ticket.status)}
                      </div>

                      {/* Rework/Validation Warning */}
                      {ticket.validationResult && ticket.validationResult.isSuccessful === false && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs">
                          <strong>AI Inspector Feedback:</strong> Repair visual inspection rejected. Instructions: {ticket.validationResult.suggestedRework}
                        </div>
                      )}

                      {/* Dispatch Comms Notes */}
                      {ticket.comments && ticket.comments.length > 0 && (
                        <div className="space-y-2">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Crew Activity Log</span>
                          <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                            {ticket.comments.map((c, i) => (
                              <div key={i} className="p-2.5 bg-slate-900/40 rounded-xl text-xs border border-slate-900">
                                <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                                  <span className="font-bold">{c.author}</span>
                                  <span>{new Date(c.createdAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-slate-350 font-medium">{c.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CitizenPortal;
