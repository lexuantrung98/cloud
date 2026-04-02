using AccountService.Entities;
using Microsoft.EntityFrameworkCore;
using BCrypt.Net;

namespace AccountService.Data
{
    public static class SeedData
    {
        public static async Task InitializeAsync(AccountDbContext context)
        {
            if (await context.Users.AnyAsync())
                return;

            var users = new List<User>
            {
                new User
                {
                    Id = Guid.NewGuid(),
                    Email = "admin@collabsphere.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("Admin@123"),
                    Role = "Admin",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
                new User
                {
                    Id = Guid.NewGuid(),
                    Email = "staff@collabsphere.com",
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword("staff@123"),
                    Role = "Staff",
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow
                },
            };

            context.Users.AddRange(users);
            await context.SaveChangesAsync();
        }
    }
}
