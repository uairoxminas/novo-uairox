import { MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function WhatsAppButton() {
  return (
    <motion.a
      href="https://wa.me/5531999999999?text=Olá! Quero saber mais sobre a UAIROX"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-3 bg-[#25D366] text-white rounded-full shadow-lg shadow-[#25D366]/30 hover:shadow-[#25D366]/50 transition-all group"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label="Fale conosco no WhatsApp"
    >
      <MessageCircle size={22} fill="currentColor" />
      <span className="text-sm font-semibold hidden sm:inline group-hover:inline transition-all">
        Fale conosco
      </span>
    </motion.a>
  );
}
