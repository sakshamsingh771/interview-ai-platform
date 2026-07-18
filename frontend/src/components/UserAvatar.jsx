import { useState } from "react";

function getInitials(fullName) {
  if (!fullName) return "?";
  const parts = fullName.trim().split(/\s+/);
  const initials = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0][0];
  return initials.toUpperCase();
}

export default function UserAvatar({ user, size = 32 }) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = user?.profile_picture_url && !imgFailed;

  if (showImage) {
    return (
      <img
        src={user.profile_picture_url}
        alt={user.full_name}
        onError={() => setImgFailed(true)}
        className="rounded-full border border-border object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-gold/20 font-display font-semibold text-gold"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {getInitials(user?.full_name)}
    </div>
  );
}
