'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  MessageCircle, 
  ChevronDown, 
  HelpCircle, 
  Mail
} from 'lucide-react';

interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: 1,
    question: 'How do I place an order for Pickup, Eat-In, or Delivery?',
    answer: 'You can easily place an order through our Guest Web App. On the main page or menu section, select your preferred order mode (Eat In, Pickup, or Delivery) and choose your nearest Corgi Cafe location (Pedralbes Centre or Eixample Cafe). Browse the menu, customize your coffee and food items with milk options, syrups, or dietary preferences, and proceed to checkout. You will receive real-time notifications as our baristas prepare your order.'
  },
  {
    id: 2,
    question: 'Can I schedule an order for a specific time in advance?',
    answer: 'Yes! When selecting Pickup during checkout, you can choose between "ASAP" (prepared immediately in 5-10 minutes) or "Schedule for Later". You can pick a specific 15-minute pickup window up to 7 days in advance. Our kitchen team will automatically begin crafting your drinks and fresh food so it is piping hot the moment you walk through our doors.'
  },
  {
    id: 3,
    question: 'What should I do if I need to modify or cancel an active order?',
    answer: 'If your order has just been placed and is in the "Received" stage, you can quickly tap the "Modify / Cancel Order" button directly on your active order status page or call our cafe line. Once our baristas have started steaming milk or baking food (stage "Preparing"), modifications may no longer be possible. For urgent help, use our live WhatsApp support button below.'
  },
  {
    id: 4,
    question: 'How do I report a missing item, incorrect order, or allergen concern?',
    answer: 'We strive for perfection with every single cup and dish, but if anything is not 100% right, please let our cafe team know immediately in person or tap the "Contact Support" button. We will happily remake your item instantly or issue an immediate refund or cashback credit directly to your Corgi Wallet.'
  },
  {
    id: 5,
    question: 'How does the Corgi Cafe Cashback & Loyalty system work?',
    answer: 'Our Loyalty Program rewards you automatically on every single purchase! You earn between 5% and 12% cashback in Corgi Points depending on your current Loyalty Tier level (Friend, Explorer, Member, Expert, VIP, or Legend). 1 Corgi Point equals 1€ in real store credit that you can redeem anytime at checkout for free coffee, pastries, or merchandise.'
  },
  {
    id: 6,
    question: 'How do I upgrade my Loyalty Tier status (Explorer, Expert, Legend)?',
    answer: 'Your Loyalty Tier upgrades automatically as your lifetime spend at Corgi Cafe grows. All new guests start as "Friend" (5% cashback). Reaching 50€ total spend unlocks "Explorer" (7% cashback), 150€ unlocks "Member" (8% cashback), 300€ unlocks "Expert" (10% cashback), and 500€+ unlocks our elite "Legend" tier with 12% cashback, free birthday treats, and VIP event invitations.'
  },
  {
    id: 7,
    question: 'Can I add my Corgi Loyalty Pass to Apple Wallet or Google Wallet?',
    answer: 'Absolutely! On your Loyalty Club page (/loyalty), tap the "Add to Apple Wallet" or "Save to Google Pay" button. A digital pass featuring your unique guest QR code and live points balance will be saved directly to your phone. Simply scan your phone wallet pass at our POS scanner when ordering in person.'
  },
  {
    id: 8,
    question: 'Do my earned Corgi cashback points or rewards ever expire?',
    answer: 'Your Corgi cashback points remain valid for 12 months from the date of your last purchase. As long as you make at least one order or scan your loyalty code once a year, your points balance will never expire! Promotional birthday vouchers or seasonal bonus coupons may have specific expiration dates displayed on the voucher card.'
  },
  {
    id: 9,
    question: 'How do I unlock Corgi stickers and special achievement badges?',
    answer: 'Stickers are fun digital collectibles awarded when you complete specific coffee milestones! For example, ordering your first croissant unlocks the "French Croissant" sticker, visiting on Friday night unlocks "Fiesta Corgi", and staying connected to our cafe Wi-Fi unlocks "Workaholic". Unlocking full sticker sets rewards you with bonus cashback credits!'
  },
  {
    id: 10,
    question: 'Which payment methods are accepted in the app and physical cafes?',
    answer: 'In our web app, we support instant Apple Pay, Google Pay, major Credit/Debit Cards (Visa, Mastercard, American Express), and your Corgi Cashback Wallet balance. In our physical cafes, you can pay via contactless cards, mobile wallets, cash, or Corgi Digital Gift Cards.'
  },
  {
    id: 11,
    question: 'Is my payment information secure when ordering online?',
    answer: 'Yes, 100%. All online payments are processed through Stripe and bank-grade SSL/TLS encrypted tokens compliant with PCI-DSS Level 1 security standards. Corgi Cafe never stores or has access to your full credit card numbers or security CVV codes.'
  },
  {
    id: 12,
    question: 'How can I request an official tax invoice or digital VAT (IVA) receipt?',
    answer: 'Every order automatically generates a digital receipt accessible under your "Orders" tab. If you require a formal invoice for business expenses (Factura Simplificada or Factura Completa with NIF/CIF company tax ID), tap "Request VAT Invoice" on the order details page or email billing@corgicafe.com with your tax details.'
  },
  {
    id: 13,
    question: 'Where can I find detailed allergen information for drinks and pastries?',
    answer: 'We take food safety and dietary needs very seriously. Every item in our menu displays allergen tags (Gluten, Dairy, Nuts, Soy, Eggs, Vegan). When adding items to your cart, you can select custom preparation notes (e.g. "Strict Gluten-Free preparation", "Nut Allergy"). Our kitchen uses dedicated color-coded tools for allergen preparation.'
  },
  {
    id: 14,
    question: 'Do you offer plant-based milk alternatives for specialty coffee?',
    answer: 'Yes! We offer a full selection of premium barista-grade plant milks including Oatly Barista Oat Milk, Almond Milk, Soy Milk, and Coconut Milk. You can select your preferred milk choice with zero extra charge on all milk-based beverages.'
  },
  {
    id: 15,
    question: 'Are your bakery items and brunch ingredients prepared fresh daily?',
    answer: 'Always! Our pastry chefs and bakers begin work at 5:00 AM every single morning in our main bakery kitchen. All croissants, sourdough breads, avocado toasts, and signature Corgi sweet treats are baked fresh daily using organic, locally sourced Spanish ingredients with zero artificial preservatives.'
  },
  {
    id: 16,
    question: 'How does shipping work for Corgi Merch online store purchases?',
    answer: 'Orders placed in our Merch Shop (/shop) are shipped within 24-48 hours via express courier. We offer free standard delivery across Spain for orders over 45€. You will receive a tracking link via SMS and email as soon as your package leaves our warehouse.'
  },
  {
    id: 17,
    question: 'How do I buy or redeem a Corgi Digital Gift Card?',
    answer: 'You can purchase digital gift cards in values of 15€, 25€, 50€, or custom amounts under our Gift Card section. The recipient receives a beautiful digital card with a redeemable claim code via email or SMS. To redeem, enter the code in your app account wallet or show the code at our cafe checkout.'
  },
  {
    id: 18,
    question: 'How do I update my profile data or request account deletion under GDPR?',
    answer: 'You can update your name, email, and phone number anytime in your profile settings. Under EU GDPR regulations, you have the right to request a full export of your personal data or complete account deletion. Simply email privacy@corgicafe.com or tap "Request Account Deletion" in your privacy settings, and your data will be permanently purged within 30 days.'
  }
];

export default function FaqPage() {
  const router = useRouter();
  const [expandedFaqId, setExpandedFaqId] = useState<number | null>(1);

  const toggleFaq = (id: number) => {
    setExpandedFaqId(expandedFaqId === id ? null : id);
  };

  const handleOpenLiveChat = () => {
    window.open('https://wa.me/34600111222?text=Hello%20Corgi%20Cafe%20Support!%20I%20have%20a%20question.', '_blank');
  };

  return (
    <div className="h-screen overflow-y-auto bg-white pb-[120px] relative scroll-smooth">
      {/* Header section */}
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
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/80 leading-none">Help &amp; Assistance</span>
            <h1 className="text-xl font-bold tracking-tight leading-none text-white mt-1 truncate">
              FAQ &amp; Support
            </h1>
          </div>

          {/* Chat / Support Button */}
          <button
            onClick={handleOpenLiveChat}
            className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center shadow-sm shadow-black/5 hover:bg-white transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
            title="Live Chat Support"
          >
            <MessageCircle className="w-5 h-5 text-gray-900" strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-[480px] mx-auto px-6 pt-4 flex flex-col gap-5">

        {/* FAQ Accordion List (Pure White Page Style - No Card Frames) */}
        <div className="flex flex-col">
          {FAQ_ITEMS.map((faq) => {
            const isExpanded = expandedFaqId === faq.id;
            return (
              <div 
                key={faq.id}
                className="border-b border-gray-100 py-3.5 transition-all"
              >
                <button
                  onClick={() => toggleFaq(faq.id)}
                  className="w-full flex items-start justify-between gap-3 text-left cursor-pointer py-1 group"
                >
                  <h3 className="text-sm font-semibold text-gray-900 leading-snug group-hover:text-black transition-colors flex-1">
                    {faq.question}
                  </h3>
                  <div className={`w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-gray-200' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-700" />
                  </div>
                </button>

                {isExpanded && (
                  <div className="pt-2 pb-1 text-xs text-gray-600 leading-relaxed transition-all">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Contact Support Options */}
        <div className="flex flex-col gap-4 pt-4 border-t border-gray-200/80 mt-1">
          <div className="flex flex-col gap-1">
            <h3 className="text-base font-semibold text-gray-900 leading-tight">
              Still have questions?
            </h3>
            <p className="text-xs text-gray-500">
              Our guest support baristas are online 7 days a week from 8:00 AM to 9:00 PM to help you.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {/* WhatsApp and Telegram in 1 Row with Official PNG Logos */}
            <div className="grid grid-cols-2 gap-3 w-full">
              {/* WhatsApp Contact Button */}
              <a
                href="https://wa.me/34600111222?text=Hello%20Corgi%20Cafe%20Support!"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#F4F4F5] hover:bg-gray-200 text-gray-900 font-semibold text-sm py-3.5 px-4 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-gray-200/60 cursor-pointer"
              >
                <img 
                  src="https://static.vecteezy.com/system/resources/previews/018/930/464/non_2x/whatsapp-logo-whatsapp-icon-whatsapp-transparent-free-png.png" 
                  alt="WhatsApp" 
                  className="w-5 h-5 object-contain flex-shrink-0" 
                />
                <span className="font-semibold text-gray-900">WhatsApp</span>
              </a>

              {/* Telegram Contact Button */}
              <a
                href="https://t.me/corgicafe_support"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#F4F4F5] hover:bg-gray-200 text-gray-900 font-semibold text-sm py-3.5 px-4 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-gray-200/60 cursor-pointer"
              >
                <img 
                  src="https://upload.wikimedia.org/wikipedia/commons/5/5c/Telegram_Messenger.png" 
                  alt="Telegram" 
                  className="w-5 h-5 object-contain flex-shrink-0" 
                />
                <span className="font-semibold text-gray-900">Telegram</span>
              </a>
            </div>

            {/* Email Contact Button (Yellow Background & White Text) */}
            <a
              href="mailto:support@corgicafe.com"
              className="w-full bg-[#FDBD38] hover:bg-[#f5b32a] text-white font-semibold text-sm py-3.5 px-4 rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Mail className="w-4.5 h-4.5 text-white flex-shrink-0" />
              <span className="font-semibold text-white">Email Support (support@corgicafe.com)</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
