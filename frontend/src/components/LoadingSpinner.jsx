export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center justify-center p-8 animate-fade-in">
      {/* Double Circle Spinner */}
      <div className="relative w-16 h-16">
        {/* Base circle */}
        <div className="absolute inset-0 rounded-full border-4 border-dark-700"></div>
        {/* Gradient spinner */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary-500 border-r-secondary-500 animate-spin"></div>
      </div>

      {/* Message */}
      <p className="mt-4 text-gray-400 animate-pulse">
        Génération en cours...
      </p>
    </div>
  );
}
