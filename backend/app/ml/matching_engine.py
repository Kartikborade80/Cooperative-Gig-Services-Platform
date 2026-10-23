import math
from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from app.models.models import Worker, WorkerSkill, Skill
from app.core.config import settings

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates great-circle distance between two coordinates in kilometers.
    """
    R = 6371.0  # Earth's radius in kilometers
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) ** 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)

class FairWorkerMatchingEngine:
    WEIGHT_SKILL = 0.30
    WEIGHT_AVAILABILITY = 0.20
    WEIGHT_DISTANCE = 0.15
    WEIGHT_RELIABILITY = 0.15
    WEIGHT_RATING = 0.10
    WEIGHT_FAIRNESS = 0.10

    @classmethod
    def score_distance(cls, distance_km: float, max_radius_km: float = 20.0) -> float:
        if distance_km <= 2.0:
            return 100.0
        elif distance_km <= 5.0:
            return 88.0
        elif distance_km <= 10.0:
            return 75.0
        elif distance_km <= 15.0:
            return 60.0
        elif distance_km <= max_radius_km:
            return max(30.0, 100.0 - (distance_km * 3.5))
        else:
            return 0.0

    @classmethod
    def score_fairness(cls, recent_jobs_count: int, total_earnings: float) -> float:
        """
        Fairness factor promotes equitable job distribution.
        Workers with fewer recent jobs receive higher fairness compensation.
        """
        if recent_jobs_count == 0:
            return 100.0
        elif recent_jobs_count <= 2:
            return 88.0
        elif recent_jobs_count <= 4:
            return 75.0
        elif recent_jobs_count <= 6:
            return 60.0
        else:
            return 45.0

    @classmethod
    def match_workers(
        cls,
        db: Session,
        service_id: int,
        customer_lat: float,
        customer_lon: float,
        required_skill_name: str = "",
        category_name: str = "",
        is_emergency: bool = False,
        max_results: int = 6,
        max_radius_km: float = 20.0
    ) -> List[Dict[str, Any]]:
        """
        Executes multi-factor worker matching algorithm.
        CRITICAL RULES:
        1. Rejects any worker outside max_radius_km (Default: 20 KM).
        2. Strictly filters by category/skill: Unrelated workers are excluded.
        Returns verified candidate workers ranked by composite score.
        """
        # 1. Fetch verified workers only
        query = db.query(Worker).filter(Worker.verification_status == "VERIFIED")
        if is_emergency:
            query = query.filter(Worker.emergency_available == True)
        
        candidates = query.all()
        results = []

        for worker in candidates:
            w_lat = worker.lat or settings.DEFAULT_LAT
            w_lon = worker.lon or settings.DEFAULT_LON
            distance_km = calculate_haversine_distance(customer_lat, customer_lon, w_lat, w_lon)

            # --- STRICT 20 KM RADIUS RULE ---
            if distance_km > max_radius_km:
                continue

            # --- STRICT CATEGORY & SKILL FILTER ---
            worker_cats = [c.category_name.lower() for c in worker.categories if c.is_verified]
            worker_skills = db.query(WorkerSkill).join(Skill).filter(
                WorkerSkill.worker_id == worker.id
            ).all()
            worker_skill_names = [ws.skill.name.lower() for ws in worker_skills if ws.skill]
            worker_skill_cats = [ws.skill.category.lower() for ws in worker_skills if ws.skill and ws.skill.category]
            all_terms = worker_cats + worker_skill_names + worker_skill_cats

            # If category_name is provided, worker MUST have this category!
            if category_name and category_name.strip():
                clean_cat = category_name.strip().lower()
                has_cat_match = any(clean_cat in t or t in clean_cat for t in all_terms)
                if not has_cat_match:
                    continue # Exclude non-matching worker

            elif required_skill_name and required_skill_name.strip():
                clean_req = required_skill_name.strip().lower()
                has_skill_match = any(clean_req in t or t in clean_req for t in all_terms)
                if not has_skill_match:
                    continue

            # Calculate skill score based on matched proficiency
            skill_score = 75.0
            target_str = (category_name or required_skill_name).lower()
            for ws in worker_skills:
                skill_obj = ws.skill
                if not skill_obj:
                    continue
                s_name = skill_obj.name.lower()
                s_cat = skill_obj.category.lower()
                if (target_str in s_name or s_name in target_str or target_str in s_cat or s_cat in target_str):
                    if ws.proficiency_level == "Expert":
                        skill_score = 100.0
                    elif ws.proficiency_level == "Intermediate":
                        skill_score = 88.0
                    else:
                        skill_score = 75.0
                    break

            # Availability score
            if is_emergency:
                avail_score = 100.0 if (worker.is_available and worker.emergency_available) else 20.0
            else:
                avail_score = 100.0 if worker.is_available else 30.0

            # Distance score
            dist_score = cls.score_distance(distance_km, max_radius_km)

            # ETA calculation (urban speed 25 km/h + 5 min prep)
            eta_minutes = max(8, int((distance_km / 25.0) * 60) + 5)

            # Reliability score
            rel_score = float(worker.reliability_score or 95.0)

            # Rating score (0 to 100)
            avg_rating = float(worker.average_rating or 5.0)
            rating_score = min(100.0, (avg_rating / 5.0) * 100.0)

            # Fairness score
            fair_score = cls.score_fairness(worker.recent_jobs_count or 0, worker.total_earnings or 0.0)

            # Final weighted composite score
            final_score = (
                (skill_score * cls.WEIGHT_SKILL) +
                (avail_score * cls.WEIGHT_AVAILABILITY) +
                (dist_score * cls.WEIGHT_DISTANCE) +
                (rel_score * cls.WEIGHT_RELIABILITY) +
                (rating_score * cls.WEIGHT_RATING) +
                (fair_score * cls.WEIGHT_FAIRNESS)
            )

            scores_breakdown = {
                "skill_match": round(skill_score, 1),
                "availability": round(avail_score, 1),
                "distance": round(dist_score, 1),
                "reliability": round(rel_score, 1),
                "customer_rating": round(rating_score, 1),
                "fairness_factor": round(fair_score, 1),
                "final_score": round(final_score, 1),
                "distance_km": distance_km,
                "eta_minutes": eta_minutes
            }

            summary = (
                f"Skill: {scores_breakdown['skill_match']}%, Avail: {scores_breakdown['availability']}%, "
                f"Dist: {distance_km}km ({scores_breakdown['distance']}%), Rel: {scores_breakdown['reliability']}%, "
                f"Rating: {scores_breakdown['customer_rating']}%, Fair: {scores_breakdown['fairness_factor']}% "
                f"=> Final: {scores_breakdown['final_score']}%"
            )

            results.append({
                "worker": worker,
                "scores": scores_breakdown,
                "matching_summary": summary
            })

        # Sort descending by composite final_score
        results.sort(key=lambda x: x["scores"]["final_score"], reverse=True)

        # Assign consumer-friendly badges
        if results:
            results[0]["consumer_badge"] = "Best Match"
            
            # Find nearest
            nearest_idx = min(range(len(results)), key=lambda i: results[i]["scores"]["distance_km"])
            if nearest_idx != 0:
                results[nearest_idx]["consumer_badge"] = "Nearest"

            # Find top rated
            top_rated_idx = max(range(len(results)), key=lambda i: results[i]["worker"].average_rating or 0)
            if top_rated_idx != 0 and "consumer_badge" not in results[top_rated_idx]:
                results[top_rated_idx]["consumer_badge"] = "Top Rated"

        for r in results:
            if "consumer_badge" not in r:
                r["consumer_badge"] = "Available Now" if r["worker"].is_available else "Recommended"

        return results[:max_results]
