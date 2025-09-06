import NotificationBadge from '../NotificationBadge';

const Navigation: React.FC = () => {
  return (
    <nav className="bg-[#1a1a1a] border-b border-[#333] fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <NotificationBadge />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 