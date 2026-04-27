// Trigger HMR
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

// Reviews data
const reviews = [
  {
    id: 1,
    name: 'Sarah Johnson',
    position: 'DevOps Engineer',
    content: 'dPIN has completely transformed our monitoring strategy. The decentralized approach gives us confidence that our monitoring data is tamper-proof and always available, even during major outages.',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/women/34.jpg',
    company: 'Cipher Technologies'
  },
  {
    id: 2,
    name: 'Michael Chen',
    position: 'CTO',
    content: 'The blockchain-backed immutability of monitoring records has been a game-changer for our compliance reporting. We can now prove beyond doubt that our systems meet our SLA requirements.',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/men/52.jpg',
    company: 'CloudNative Solutions'
  },
  {
    id: 3,
    name: 'Elena Rodriguez',
    position: 'Site Reliability Engineer',
    content: 'We were skeptical about Web3 monitoring at first, but dPIN\'s decentralized network has consistently detected outages before our traditional monitoring tools even notice them.',
    rating: 4,
    image: 'https://randomuser.me/api/portraits/women/12.jpg',
    company: 'TechFlow Systems'
  },
  {
    id: 4,
    name: 'David Nakamoto',
    position: 'Blockchain Developer',
    content: 'As someone already invested in Web3 technologies, integrating dPIN was effortless. Their API documentation is excellent and the uptime improvements have been substantial.',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/men/22.jpg',
    company: 'Decentralized Ventures'
  },
  {
    id: 5,
    name: 'Priya Sharma',
    position: 'Infrastructure Lead',
    content: 'We detected and resolved a regional outage 4 minutes faster with dPIN than our legacy monitoring system. The global node distribution provides visibility we never had before.',
    rating: 5,
    image: 'https://randomuser.me/api/portraits/women/64.jpg',
    company: 'GrowFast Startup'
  }
];

const ReviewCard = ({ review }) => (
  <div className="bg-gray-900/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 flex flex-col gap-4 w-[380px] min-h-[250px] h-full mx-3 hover:border-gray-600 transition-colors shadow-lg group">
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 rounded-full overflow-hidden border border-purple-500/30 shrink-0">
        <img
          src={review.image}
          alt={review.name}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://placehold.co/48';
          }}
        />
      </div>
      <div>
        <h3 className="text-sm font-bold text-white tracking-tight leading-none mb-1">{review.name}</h3>
        <p className="text-purple-400 text-xs">{review.position}</p>
      </div>
    </div>
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={14}
          className={i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-gray-700"}
        />
      ))}
    </div>
    <blockquote className="text-gray-300 text-sm leading-relaxed relative mt-1 flex-1">
      <span className="text-3xl text-purple-500/20 font-serif absolute -top-3 -left-2 select-none">"</span>
      <span className="relative z-10 pl-3 block">{review.content}</span>
    </blockquote>
  </div>
);

const Reviews = () => {
  return (
    <section id="testimonials" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B1F]/0 via-[#0B0B1F] to-[#0B0B1F]/0 pointer-events-none"></div>
      
      {/* Purple glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-purple-700/20 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
            Trusted by Web3 Pioneers
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            Join hundreds of innovative teams who've upgraded to our decentralized monitoring platform.
          </p>
        </motion.div>

        {/* Infinite Marquee Container */}
        <div className="relative flex overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] group py-4">
          
          {/* First block of cards */}
          <div className="flex shrink-0 animate-[scroll-left_50s_linear_infinite] group-hover:[animation-play-state:paused] items-stretch">
            {reviews.map((review) => (
              <ReviewCard key={`first-${review.id}`} review={review} />
            ))}
          </div>
          
          {/* Second block of cards for seamless looping */}
          <div className="flex shrink-0 animate-[scroll-left_50s_linear_infinite] group-hover:[animation-play-state:paused] items-stretch">
            {reviews.map((review) => (
              <ReviewCard key={`second-${review.id}`} review={review} />
            ))}
          </div>

        </div>
      </div>
    </section>
  );
};

export default Reviews;
