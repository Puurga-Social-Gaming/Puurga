import re

with open('src/pages/GroupDetail.tsx', 'r') as f:
    content = f.read()

# Fix layout backgrounds
content = content.replace('bg-[#0a0a0a]', 'bg-background').replace('border-gray-800', 'border-border')
content = content.replace('bg-[#1a1a1a]', 'bg-card')
content = content.replace('border-gray-700', 'border-border')

# Message input
content = content.replace('text-white placeholder-gray-400 focus:ring-white', 'text-foreground placeholder-muted focus:ring-accent')

# Left sidebar (Members, Settings)
content = content.replace('text-lg font-bold text-white', 'text-lg font-bold text-foreground')
content = content.replace('<div className="w-full h-full flex items-center justify-center text-white font-bold">', '<div className="w-full h-full flex items-center justify-center text-foreground font-bold">')
content = content.replace('<p className="text-white text-sm font-medium truncate">', '<p className="text-foreground text-sm font-medium truncate">')
content = content.replace('<Crown size={16} className="text-white flex-shrink-0" />', '<Crown size={16} className="text-muted flex-shrink-0" />')

# Group Settings Header
content = re.sub(r'<Settings size={20} className="text-white" />', '<Settings size={20} className="text-foreground" />', content)
content = re.sub(r'hover:text-white hover:bg-white/5', 'hover:text-foreground hover:bg-card-hover', content)

# Group Settings Content
content = content.replace('<p className="text-white font-medium">', '<p className="text-foreground font-medium">')
content = content.replace('<p className="text-white text-sm font-medium">', '<p className="text-foreground text-sm font-medium">')
content = content.replace("member.role === 'admin' ? 'bg-white/20 text-white'", "member.role === 'admin' ? 'bg-accent/20 text-accent'")
content = content.replace('bg-[#2d2d2d] text-white', 'bg-input text-foreground')

# The received chat bubble (line 367)
content = content.replace("bg-card text-white rounded-bl-md", "bg-card text-foreground rounded-bl-md")

with open('src/pages/GroupDetail.tsx', 'w') as f:
    f.write(content)
