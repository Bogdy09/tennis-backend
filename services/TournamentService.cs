public class TournamentService
{
    private readonly AppDbContext _context;

    public TournamentService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<Tournament>> GetAllAsync() =>
        await _context.Tournaments.Include(t => t.FavoritePlayer).ToListAsync();

    public async Task<Tournament?> GetByIdAsync(int id) =>
        await _context.Tournaments.Include(t => t.FavoritePlayer).FirstOrDefaultAsync(t => t.Id == id);

    public async Task<Tournament> CreateAsync(Tournament tournament)
    {
        _context.Tournaments.Add(tournament);
        await _context.SaveChangesAsync();
        return tournament;
    }

    public async Task<Tournament?> UpdateAsync(int id, Tournament updated)
    {
        var existing = await _context.Tournaments.FindAsync(id);
        if (existing == null) return null;

        existing.Name = updated.Name;
        existing.Location = updated.Location;
        existing.Date = updated.Date;
        existing.PrizeMoney = updated.PrizeMoney;
        existing.FavoritePlayerId = updated.FavoritePlayerId;

        await _context.SaveChangesAsync();
        return existing;
    }

    public async Task<bool> DeleteAsync(int id)
    {
        var tournament = await _context.Tournaments.FindAsync(id);
        if (tournament == null) return false;

        _context.Tournaments.Remove(tournament);
        await _context.SaveChangesAsync();
        return true;
    }
}
