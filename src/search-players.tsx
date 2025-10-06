import { List, ActionPanel, Action, Icon, PushAction, LocalStorage } from "@raycast/api";
import React, { useEffect } from "react";

interface ModeStats {
  last?: { rating: number };
  record?: { win: number; loss: number; draw: number };
}

interface ChessStats {
  chess_bullet?: ModeStats;
  chess_blitz?: ModeStats;
  chess_rapid?: ModeStats;
  chess_daily?: ModeStats;
}

export default function SearchPlayersCommand() {
  const [query, setQuery] = React.useState("");
  const [favourites, setFavourites] = React.useState<string[]>([]);

  // Load favourites from LocalStorage
  useEffect(() => {
    (async () => {
      const stored = await LocalStorage.getItem<string>("favouritePlayers");
      if (stored) {
        setFavourites(JSON.parse(stored));
      }
    })();
  }, []);

  // Save favourites to LocalStorage
  async function saveFavourites(updated: string[]) {
    setFavourites(updated);
    await LocalStorage.setItem("favouritePlayers", JSON.stringify(updated));
  }

  function toggleFavourite(name: string) {
    const lower = name.toLowerCase();
    if (favourites.map((f) => f.toLowerCase()).includes(lower)) {
      saveFavourites(favourites.filter((f) => f.toLowerCase() !== lower));
    } else {
      saveFavourites([...favourites, name]);
    }
  }

  function moveFavourite(name: string, direction: "up" | "down") {
    const index = favourites.findIndex((f) => f.toLowerCase() === name.toLowerCase());
    if (index === -1) return;

    const newFavs = [...favourites];
    if (direction === "up" && index > 0) {
      [newFavs[index - 1], newFavs[index]] = [newFavs[index], newFavs[index - 1]];
    } else if (direction === "down" && index < newFavs.length - 1) {
      [newFavs[index + 1], newFavs[index]] = [newFavs[index], newFavs[index + 1]];
    }
    saveFavourites(newFavs);
  }

  // Filter favourites first
  const filteredFavourites = favourites.filter((name) => name.toLowerCase().includes(query.toLowerCase()));

  // Show typed candidate if not already in favourites
  const showTypedCandidate =
    query.trim().length > 0 && !filteredFavourites.some((name) => name.toLowerCase() === query.toLowerCase());

  return (
    <List searchBarPlaceholder="Search Chess.com username..." onSearchTextChange={setQuery} throttle>
      {/* Favourites at the top */}
      {filteredFavourites.map((name) => (
        <List.Item
          key={name}
          title={name}
          icon={Icon.Star}
          accessories={[{ text: "Favourite" }]}
          actions={
            <ActionPanel>
              <PushAction title="View Stats" target={<PlayerStats username={name} />} />
              <Action title="Unfavourite Player" icon={Icon.StarDisabled} onAction={() => toggleFavourite(name)} />
              <Action title="Move up" icon={Icon.ArrowUp} onAction={() => moveFavourite(name, "up")} />
              <Action title="Move Down" icon={Icon.ArrowDown} onAction={() => moveFavourite(name, "down")} />
            </ActionPanel>
          }
        />
      ))}

      {/* Typed candidate */}
      {showTypedCandidate && (
        <List.Item
          title={query}
          icon={Icon.Person}
          actions={
            <ActionPanel>
              <PushAction title="View Stats" target={<PlayerStats username={query} />} />
              <Action title="Favourite Player" icon={Icon.Star} onAction={() => toggleFavourite(query)} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

function PlayerStats({ username }: { username: string }) {
  const [stats, setStats] = React.useState<ChessStats | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch(`https://api.chess.com/pub/player/${username.toLowerCase()}/stats`);
        if (!res.ok) throw new Error(`Error: ${res.statusText}`);
        const data: ChessStats = await res.json();
        setStats(data);
      } catch (error) {
        console.error(error);
        setStats(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchStats();
  }, [username]);

  if (!isLoading && stats === null) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="No stats found"
          description={`Could not fetch stats for "${username}".`}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Viewing stats for ${username}`}>
      {stats && (
        <List.Section title={`Ratings for ${username}`}>
          {renderRatingItem("Bullet", stats.chess_bullet, username, Icon.Rocket)}
          {renderRatingItem("Blitz", stats.chess_blitz, username, Icon.Bolt)}
          {renderRatingItem("Rapid", stats.chess_rapid, username, Icon.Stopwatch)}
          {renderRatingItem("Daily", stats.chess_daily, username, Icon.Sun)}
        </List.Section>
      )}
    </List>
  );
}

function renderRatingItem(label: string, mode: ModeStats | undefined, username: string, icon: Icon) {
  if (!mode) return null;
  const rating = mode.last?.rating ?? "N/A";
  const record = mode.record ? `${mode.record.win}W / ${mode.record.loss}L / ${mode.record.draw}D` : "No games";

  return (
    <List.Item
      title={`${label}: ${rating}`}
      accessories={[{ text: record }]}
      icon={icon}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={`https://www.chess.com/member/${username}`} />
        </ActionPanel>
      }
    />
  );
}
