'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  AlertCircle, 
  Briefcase, 
  Clock, 
  MapPin, 
  Euro, 
  Sparkles, 
  CheckCircle2, 
  X, 
  User, 
  Mail, 
  Phone, 
  FileText, 
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
  const [applicantEmail, setApplicantEmail] = useState('');
  const [applicantPhone, setApplicantPhone] = useState('');
  const [applicantBio, setApplicantBio] = useState('');
  const [applicantCvUrl, setApplicantCvUrl] = useState('');
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
    if (!applicantName || !applicantEmail || !applicantPhone || !applicantBio) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);
      setApplicantName('');
      setApplicantEmail('');
      setApplicantPhone('');
      setApplicantBio('');
      setApplicantCvUrl('');
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-28 relative">
      {/* Brand Yellow Top Header with Organic Wave */}
      <div className="w-full bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 pt-6 pb-24 px-6 relative overflow-hidden select-none">
        {/* Organic SVG Wave bottom transition */}
        <svg 
          className="absolute bottom-0 left-0 w-full h-[44px] text-gray-50 fill-current translate-y-[1px]" 
          viewBox="0 0 1440 320" 
          preserveAspectRatio="none"
        >
          <path d="M0,96 C288,192 576,96 864,160 C1152,224 1344,160 1440,128 L1440,320 L0,320 Z" />
        </svg>

        <div className="max-w-[480px] mx-auto flex flex-col gap-5 relative z-10">
          {/* Top Bar: Back & Help */}
          <div className="flex items-center justify-between w-full">
            <button 
              onClick={() => router.push('/')}
              className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0"
              title="Back to Home"
            >
              <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
            </button>

            <div className="flex flex-col text-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-white/80">Careers at Corgi</span>
              <h1 className="text-xl font-extrabold text-white mt-0.5 tracking-tight leading-none">
                Join Our Team
              </h1>
            </div>

            <button
              onClick={() => alert("Careers Support: jobs@corgicafe.com")}
              className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0"
              title="Help"
            >
              <AlertCircle className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
            </button>
          </div>

          {/* Hero Corgi Sticker & Heading */}
          <div className="flex flex-col items-center text-center mt-2 px-2">
            <div className="w-20 h-20 relative mb-3 drop-shadow-md">
              <img 
                src="/stickers/corgi_laptop1.png" 
                alt="Corgi Work Sticker" 
                className="w-full h-full object-contain"
              />
            </div>
            <h2 className="text-2xl font-extrabold text-white tracking-tight leading-tight">
              Build the Future of Specialty Coffee With Us! 🐾
            </h2>
            <p className="text-xs font-semibold text-white/95 mt-2 max-w-[320px] leading-relaxed">
              We are a passionate team of baristas, bakers, and creators crafting memorable everyday experiences in Barcelona.
            </p>
          </div>
        </div>
      </div>

      {/* Vacancies Section */}
      <div className="max-w-[480px] mx-auto px-6 -mt-6 relative z-20 flex flex-col gap-6">
        
        {/* Section Header badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-4.5 h-4.5 text-[#FDBD38]" />
            <h3 className="text-base font-bold text-gray-900 tracking-tight">Open Vacancies</h3>
          </div>
          <span className="bg-[#FFF8E7] text-[#D99A10] border border-[#FDBD38]/40 px-3 py-1 rounded-full text-xs font-bold">
            {OPEN_POSITIONS.length} positions
          </span>
        </div>

        {/* Vacancies List */}
        <div className="flex flex-col gap-4">
          {OPEN_POSITIONS.map((job) => (
            <div 
              key={job.id} 
              className="bg-white rounded-[24px] p-5 shadow-xs border border-gray-100/80 hover:shadow-md transition-all flex flex-col gap-4 relative overflow-hidden"
            >
              {/* Job Header */}
              <div className="flex flex-col gap-1">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-base font-extrabold text-gray-900 leading-tight">
                    {job.title}
                  </h4>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {job.salary}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs font-semibold text-gray-400 mt-0.5">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    <span>{job.location}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{job.type}</span>
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <p className="text-xs text-gray-600 leading-relaxed">
                {job.description}
              </p>

              {/* Requirements snippet */}
              <div className="bg-gray-50 rounded-[16px] p-3.5 flex flex-col gap-1.5 border border-gray-100">
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

              {/* Tags & Action Button */}
              <div className="flex items-center justify-between pt-1 border-t border-gray-100 gap-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {job.tags.map((tag, tIdx) => (
                    <span 
                      key={tIdx} 
                      className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2.5 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => handleOpenApply(job)}
                  className="bg-[#FDBD38] hover:bg-[#e5a420] text-white font-extrabold text-xs px-4 py-2.5 rounded-full shadow-xs transition-all active:scale-[0.96] cursor-pointer whitespace-nowrap flex items-center gap-1"
                >
                  <span>Apply Now</span>
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Culture & Perks Banner */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-500 text-white rounded-[28px] p-6 shadow-md flex flex-col gap-3 relative overflow-hidden mt-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-200" />
            <h4 className="text-base font-extrabold text-white">Why Join Corgi Cafe?</h4>
          </div>
          <ul className="text-xs font-semibold text-white/95 space-y-2">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-200 flex-shrink-0" />
              <span>Unlimited specialty coffee & free team meals on shift</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-200 flex-shrink-0" />
              <span>Professional barista certifications & coffee roasting workshops</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-amber-200 flex-shrink-0" />
              <span>Competitive salaries, tip share & clear career growth</span>
            </li>
          </ul>
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
                <span className="text-[10px] font-bold text-[#D99A10] uppercase tracking-widest">Application</span>
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
                  <h4 className="text-xl font-extrabold text-gray-900">Application Received! 🎉</h4>
                  <p className="text-xs text-gray-500 max-w-[280px] leading-relaxed">
                    Thank you for applying to join Corgi Cafe! Our HR team will review your application and reach out within 48 hours.
                  </p>
                </div>
                <button
                  onClick={handleCloseModal}
                  className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white py-3.5 rounded-full font-bold text-sm shadow-sm transition-all active:scale-[0.98] cursor-pointer mt-2"
                >
                  Awesome, Close
                </button>
              </div>
            ) : (
              /* Application Form */
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
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-[#FDBD38] focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Email */}
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
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-[#FDBD38] focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Phone */}
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
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-[#FDBD38] focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-sm font-semibold text-gray-900 transition-all outline-none"
                    />
                  </div>
                </div>

                {/* Experience / Short Bio */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Short Bio & Experience *
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                    <textarea 
                      required
                      rows={3}
                      value={applicantBio}
                      onChange={(e) => setApplicantBio(e.target.value)}
                      placeholder="Tell us briefly about your hospitality background..."
                      className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-[#FDBD38] focus:bg-white rounded-[14px] py-3 pl-10 pr-4 text-xs font-medium text-gray-900 transition-all outline-none resize-none"
                    />
                  </div>
                </div>

                {/* CV Link (Optional) */}
                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                    Link to CV / LinkedIn (Optional)
                  </label>
                  <input 
                    type="url" 
                    value={applicantCvUrl}
                    onChange={(e) => setApplicantCvUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/alexmorgan"
                    className="w-full bg-[#F4F4F5] border border-gray-200/60 focus:border-[#FDBD38] focus:bg-white rounded-[14px] py-3 px-4 text-xs font-medium text-gray-900 transition-all outline-none"
                  />
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isSubmitting || !applicantName || !applicantEmail || !applicantPhone || !applicantBio}
                  className="w-full bg-[#FDBD38] hover:bg-[#e5a420] disabled:opacity-60 text-white py-3.5 rounded-full font-extrabold text-sm shadow-md transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 mt-2"
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
