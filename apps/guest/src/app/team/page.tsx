'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MessageCircle, 
  Clock, 
  MapPin, 
  Sparkles, 
  CheckCircle2, 
  X, 
  User, 
  Mail, 
  Phone, 
  Upload, 
  Send 
} from 'lucide-react';

interface JobPosition {
  id: string;
  title: string;
  department: string;
  location: string;
  type: string;
  salary: string;
  description: string;
  requirements: string[];
  tags: string[];
}

const OPEN_POSITIONS: JobPosition[] = [
  {
    id: 'barista',
    title: 'Barista / Senior Barista',
    department: 'Coffee & Service',
    location: 'Barcelona (Pedralbes & Eixample)',
    type: 'Full-time / Part-time',
    salary: '1,400€ - 1,800€ / mo',
    description: 'Passion for specialty coffee roasting, latte art, and delivering exceptional guest hospitality in our vibrant cafes.',
    requirements: [
      '1+ year experience with espresso machines & manual brew methods',
      'Knowledge of latte art & milk steaming technique',
      'Fluent in English and Spanish',
      'Positive attitude & team player mindset'
    ],
    tags: ['Specialty Coffee', 'Customer Care', 'Tips + Perks']
  },
  {
    id: 'baker',
    title: 'Pastry Chef & Baker',
    department: 'Kitchen & Bakery',
    location: 'Barcelona (Eixample)',
    type: 'Full-time',
    salary: '1,600€ - 2,000€ / mo',
    description: 'Crafting fresh croissants, signature Corgi sweet treats, and artisan brunch breads daily for our guests.',
    requirements: [
      'Experience in specialty pastry or artisan baking',
      'Attention to detail & food hygiene standards',
      'Ability to work early morning baking shifts',
      'Passion for creative dessert design'
    ],
    tags: ['Brunch & Pastry', 'Morning Shift', 'Creative Freedom']
  },
  {
    id: 'shift-lead',
    title: 'Shift Lead & Cafe Supervisor',
    department: 'Operations',
    location: 'Barcelona (Pedralbes)',
    type: 'Full-time',
    salary: '1,800€ - 2,200€ / mo',
    description: 'Leading daily cafe operations, managing staff shift schedules, guest experience excellence, and inventory reporting.',
    requirements: [
      '2+ years in hospitality leadership or cafe management',
      'Strong organizational & communication skills',
      'Familiarity with POS & digital ordering systems',
      'Problem-solving mindset under rush hours'
    ],
    tags: ['Leadership', 'Operations', 'Growth Track']
  },
  {
    id: 'host',
    title: 'Guest Experience & Host',
    department: 'Front of House',
    location: 'Barcelona (Both locations)',
    type: 'Part-time',
    salary: '10€ - 12€ / hr',
    description: 'Greeting guests with a smile, managing table seating, assisting with mobile QR orders, and ensuring welcoming vibes.',
    requirements: [
      'Enthusiastic personality & love for people',
      'Conversational Spanish and English',
      'Flexible availability for weekend brunch hours'
    ],
    tags: ['Part-time', 'Flexible Hours', 'Great Vibe']
  }
];

export default function TeamPage() {
  const router = useRouter();
  const [selectedJob, setSelectedJob] = useState<JobPosition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [applicantName, setApplicantName] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantEmail, setApplicantEmail] = useState('');
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleOpenApply = (job: JobPosition) => {
    setSelectedJob(job);
    setIsSubmitted(false);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsSubmitting(false);
  };

  const handleSubmitApplication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicantName || !applicantPhone || !applicantEmail) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setApplicantName('');
      setApplicantPhone('');
      setApplicantEmail('');
      setCvFileName(null);
    }, 1200);
  };

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 pb-[120px] relative scroll-smooth">
      {/* Compact Yellow Top Header (matching /menu & /loyalty header styling) */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 flex flex-col w-full shadow-xs select-none">
        <div className="max-w-[440px] mx-auto w-full flex items-center justify-between px-4 pt-4 pb-3 gap-3">
          {/* Back button */}
          <button 
            onClick={() => router.push('/')}
            className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
            title="Back to Home"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
          </button>

          {/* Central Title Block */}
          <div className="flex-1 flex flex-col text-center items-center justify-center min-w-0 mx-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 leading-none">Careers at Corgi</span>
            <h1 className="text-xl font-bold tracking-tight leading-none text-white mt-1 truncate">
              Join Our Team
            </h1>
          </div>

          {/* Support / Help Icon */}
          <button
            onClick={() => router.push('/faq')}
            className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
            title="FAQ & Support"
          >
            <MessageCircle className="w-5 h-5 text-gray-900" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[480px] mx-auto px-6 pt-5 flex flex-col gap-5">

        {/* Vacancies List */}
        <div className="flex flex-col gap-4">
          {OPEN_POSITIONS.map((job) => (
            <div 
              key={job.id} 
              onClick={() => handleOpenApply(job)}
              className="bg-white rounded-[24px] p-5 shadow-xs border border-gray-200/60 hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-4 relative overflow-hidden cursor-pointer"
            >
              {/* Job Title & Yellow Salary Badge */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900 leading-tight flex-1">
                    {job.title}
                  </h3>
                  <span className="text-[12px] font-bold text-white bg-[#FDBD38] px-3.5 py-1.5 rounded-full whitespace-nowrap shadow-xs flex-shrink-0">
                    {job.salary}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-gray-400">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{job.type}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-xs text-gray-600 leading-relaxed">
                {job.description}
              </p>

              {/* Key Requirements */}
              <div className="bg-gray-50/80 rounded-[18px] p-3.5 flex flex-col gap-1.5 border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Key Requirements</span>
                <ul className="space-y-1">
                  {job.requirements.map((req, idx) => (
                    <li key={idx} className="text-[11px] font-medium text-gray-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#FDBD38] mt-1.5 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Bottom Row: Tags & Full-Width Apply Button */}
              <div className="flex flex-col pt-2 border-t border-gray-100 gap-3">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {job.tags.map((tag, tIdx) => (
                    <span 
                      key={tIdx} 
                      className="bg-gray-100 text-gray-600 text-[10px] font-semibold px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenApply(job);
                  }}
                  className="w-full bg-black hover:bg-gray-800 text-white font-bold text-sm py-3 rounded-full transition-all active:scale-[0.98] cursor-pointer text-center shadow-xs mt-0.5"
                >
                  Apply Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Application Form Modal */}
      {isModalOpen && selectedJob && (
        <div 
          className="fixed inset-0 bg-transparent z-50 flex items-center justify-center p-4 backdrop-blur-md transition-all animate-in fade-in duration-200"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-[28px] p-6 sm:p-7 max-w-[440px] w-full shadow-2xl relative flex flex-col gap-5 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Application</span>
                <h3 className="text-lg font-bold text-gray-900 leading-tight">
                  Apply for {selectedJob.title}
                </h3>
              </div>
              <button 
                onClick={handleCloseModal}
                className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Application Success State */}
            {isSubmitted ? (
              <div className="flex flex-col items-center text-center py-6 gap-4">
                <div className="w-24 h-24 relative">
                  <img 
                    src="/stickers/corgi_fiesta_1.png" 
                    alt="Success Celebration" 
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <h4 className="text-xl font-bold text-gray-900">Application Received!</h4>
                  <p className="text-xs text-gray-500 max-w-[280px] leading-relaxed">
                    Thank you for applying to join Corgi Cafe! Our HR team will review your application and reach out within 48 hours.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-black hover:bg-gray-800 text-white py-3.5 rounded-full font-bold text-sm shadow-xs transition-all active:scale-[0.98] cursor-pointer mt-2"
                >
                  Awesome, Close
                </button>
              </div>
            ) : (
              /* Application Form: Name, Phone, Email, Upload CV */
              <form onSubmit={handleSubmitApplication} className="flex flex-col gap-4">
                {/* Full Name */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="text" 
                      required
                      value={applicantName}
                      onChange={(e) => setApplicantName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-black focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="tel" 
                      required
                      value={applicantPhone}
                      onChange={(e) => setApplicantPhone(e.target.value)}
                      placeholder="+34 600 111 222"
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-black focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <input 
                      type="email" 
                      required
                      value={applicantEmail}
                      onChange={(e) => setApplicantEmail(e.target.value)}
                      placeholder="alex@example.com"
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-black focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Upload CV */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Upload CV (Resume) *
                  </label>
                  <input 
                    type="file" 
                    id="cv-file-input"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setCvFileName(e.target.files[0].name);
                      }
                    }}
                    className="hidden"
                  />
                  <label 
                    htmlFor="cv-file-input"
                    className="w-full bg-[#F4F4F5] hover:bg-gray-200/70 border-2 border-dashed border-gray-300 hover:border-black rounded-[16px] p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all text-center"
                  >
                    <Upload className="w-5 h-5 text-gray-700" />
                    <span className="text-xs font-bold text-gray-800">
                      {cvFileName ? cvFileName : 'Click to Upload CV (PDF, DOCX)'}
                    </span>
                    <span className="text-[10px] font-medium text-gray-400">
                      {cvFileName ? 'Click to replace file' : 'Maximum file size: 10MB'}
                    </span>
                  </label>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || !applicantName || !applicantPhone || !applicantEmail}
                  className="w-full bg-black hover:bg-gray-800 disabled:opacity-60 text-white py-3.5 rounded-full font-bold text-sm transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-xs"
                >
                  {isSubmitting ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <span>Send Application</span>
                      <Send className="w-4 h-4 text-white" />
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
