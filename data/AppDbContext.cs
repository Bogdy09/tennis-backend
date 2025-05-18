public DbSet<Tournament> Tournaments { get; set; }

protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Tournament>()
        .HasOne(t => t.FavoritePlayer)
        .WithMany() // or `.WithMany(p => p.FavoriteTournaments)` if bidirectional
        .HasForeignKey(t => t.FavoritePlayerId)
        .OnDelete(DeleteBehavior.Restrict);
}
