# Educational Stress Testing Scenarios

## Realistic Test Scenario

The `test_simulation_realistic.json` file contains a carefully calibrated scenario that demonstrates **clear differences** between the four optimization strategies.

### Course Details

- **Course**: Full-Stack Web Development (CS-220)
- **Duration**: 12 weeks
- **Difficulty**: 3 (moderate)
- **ECTS**: 5 credits
- **Attendance**: Hybrid
- **Students**: 60
- **Assignments**: 3 major projects
- **Total Homework**: 100 hours

### Original Schedule Characteristics

The schedule has **intentional stress peaks** during assignment deadline weeks:
- Week 4: 12h homework (end of Assignment 1)
- Week 8: 11h homework (end of Assignment 2)
- Week 12: 13h homework (end of Assignment 3)

Lower-stress weeks:
- Weeks 5, 7, 9: 6-9h homework
- Allows for redistribution opportunities

### Four Optimization Strategies

#### 1. Minimal Adjustment (adjustment_1)
**Strategy**: Only fix critical stress weeks (>85)

**Results**:
- Adjusted weeks: 9/12
- Average stress: **74**
- Peak stress: 100 (on deadline weeks)
- Week 5 stress: 99
- Week 9 stress: 98

**Best for**: Instructors who want minimal disruption to original plan

---

#### 2. Balanced Redistribution (adjustment_2)
**Strategy**: Smooth stress curve, target >75 threshold

**Results**:
- Adjusted weeks: 9/12
- Average stress: **73** ✓
- Peak stress: 100
- Week 5 stress: **90** ✓ (9-point improvement)
- Week 9 stress: 98

**Best for**: Balanced approach with noticeable stress reduction

---

#### 3. Aggressive Optimization (adjustment_3)
**Strategy**: Maximum stress reduction on all high weeks

**Results**:
- Adjusted weeks: 9/12
- Average stress: **72** ✓✓ (lowest)
- Peak stress: 100
- Week 5 stress: **90** ✓
- Week 9 stress: **88** ✓✓ (10-point improvement - best!)

**Best for**: Maximum student well-being, willing to heavily restructure

---

#### 4. Extension-Based (adjustment_4)
**Strategy**: Uses assignment deadline extensions + moderate reduction

**Results**:
- Adjusted weeks: 9/12
- Average stress: **74**
- Peak stress: 100
- Week 5 stress: 99
- Week 9 stress: 98

**Best for**: Courses where deadline flexibility is acceptable

---

## Key Differences Visualized

### Homework Hours - Week 4 (High Stress)
```
Original:     12h
Minimal:       9h (-25%)
Balanced:      8h (-33%)
Aggressive:    7h (-42%) ✓ Most reduction
Extension:     9h (-25%)
```

### Stress Levels - Week 9 (Mid-Range)
```
Minimal:      98
Balanced:     98
Aggressive:   88 ✓ Clearly better!
Extension:    98
```

### Average Stress Across Semester
```
Original:     ~85
Minimal:      74 (13% reduction)
Balanced:     73 (14% reduction)
Aggressive:   72 (15% reduction) ✓ Best overall
Extension:    74 (13% reduction)
```

## How to Test

### Using curl:
```bash
# Create simulation
curl -X POST https://backend.localhost/api/simulations/education/ \
  -H "Content-Type: application/json" \
  -d @backend/test_simulation_realistic.json

# Retrieve results (use caseId from response)
curl https://backend.localhost/api/simulations/education/{caseId}
```

### View in UI:
1. Open https://app.localhost
2. Navigate to Educational Stress section
3. Upload `test_simulation_realistic.json`
4. View results with comparison charts

## Why This Scenario Works

1. **Moderate difficulty** (3/5) - Not so hard that all strategies fail
2. **Realistic homework distribution** (6-13h per week) - Enough variation to optimize
3. **Clear deadline weeks** - Creates natural stress peaks
4. **Redistribution opportunities** - Low-stress weeks can absorb extra hours
5. **Observable differences** - Each strategy produces measurably different outcomes

## What Makes a Bad Test Scenario

❌ **Too extreme**:
- Difficulty 5, no prerequisites
- 15-20h homework every week
- Multiple overlapping deadlines
- Result: All strategies still hit 100 stress

❌ **Too easy**:
- Difficulty 1, all online
- 3-5h homework every week
- No deadlines
- Result: No stress to optimize, all strategies identical

✅ **Just right** (this file):
- Moderate difficulty with some challenging weeks
- Varied workload (6-13h range)
- Spaced deadlines with peaks
- Result: Clear differentiation between strategies
