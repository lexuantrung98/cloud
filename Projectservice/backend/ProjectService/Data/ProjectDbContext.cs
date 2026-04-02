using Microsoft.EntityFrameworkCore;
using ProjectService.Models;

namespace ProjectService.Data;

public class ProjectDbContext : DbContext
{
    public ProjectDbContext(DbContextOptions<ProjectDbContext> options) : base(options)
    {
    }

    public DbSet<ProjectTemplate> ProjectTemplates { get; set; }
    public DbSet<ProjectMilestone> ProjectMilestones { get; set; }
    public DbSet<ProjectInstance> ProjectInstances { get; set; }
    public DbSet<ProjectGroup> ProjectGroups { get; set; }
    public DbSet<ProjectGroupMember> ProjectGroupMembers { get; set; }
    public DbSet<ProjectSubmission> ProjectSubmissions { get; set; }
    public DbSet<ProjectTask> ProjectTasks { get; set; }
    public DbSet<TaskSubItem> TaskSubItems { get; set; }
    public DbSet<TaskComment> TaskComments { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; } // Activity logging
    public DbSet<GroupMilestone> GroupMilestones { get; set; } // Internal group milestones
    public DbSet<GroupMilestoneComment> GroupMilestoneComments { get; set; }
    public DbSet<GroupMilestoneGrade> GroupMilestoneGrades { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<ProjectTemplate>()
            .HasMany(p => p.Milestones)
            .WithOne(m => m.ProjectTemplate)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectGroup>()
            .HasMany(g => g.Members)
            .WithOne(m => m.Group)
            .OnDelete(DeleteBehavior.Cascade);
            
        modelBuilder.Entity<ProjectTask>()
            .HasMany(t => t.SubTasks)
            .WithOne(s => s.ProjectTask)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectTask>()
            .HasMany(t => t.Comments)
            .WithOne(c => c.ProjectTask)
            .OnDelete(DeleteBehavior.Cascade);
    }

}
